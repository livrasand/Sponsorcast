import axios from 'axios';

// Función para obtener todos los patrocinadores de un usuario (con paginación)
export async function getAllSponsors(pat_token) {
  const sponsors = [];
  let hasNextPage = true;
  let endCursor = null;

  const query = (after = null) => `
    {
      viewer {
        sponsorshipsAsMaintainer(first: 100${after ? `, after: "${after}"` : ''}) {
          nodes {
            sponsorEntity {
              ... on User {
                login
                name
                avatarUrl
              }
              ... on Organization {
                login
                name
                avatarUrl
              }
            }
            createdAt
            tier {
              name
              monthlyPriceInDollars
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  try {
    while (hasNextPage) {
      const response = await axios.post(
        'https://api.github.com/graphql',
        { query: query(endCursor) },
        {
          headers: {
            Authorization: `Bearer ${pat_token}`,
            'User-Agent': 'Sponsorcast',
          },
        }
      );

      if (response.data.errors) {
        console.error('GraphQL errors:', response.data.errors);
        break;
      }

      const data = response.data.data?.viewer?.sponsorshipsAsMaintainer;
      if (!data) break;

      sponsors.push(...data.nodes);
      hasNextPage = data.pageInfo.hasNextPage;
      endCursor = data.pageInfo.endCursor;
    }

    return sponsors;
  } catch (error) {
    console.error('Error getting sponsors:', error.message);
    return [];
  }
}

// Función para verificar si un usuario es patrocinador usando PAT del creador
export async function isSponsorOfCreator(pat_token, visitorLogin) {
  try {
    const sponsors = await getAllSponsors(pat_token);
    const isSponsoring = sponsors.some(s => s.sponsorEntity?.login === visitorLogin);
    
    console.log(`Checking if ${visitorLogin} sponsors creator: ${isSponsoring}`);
    return isSponsoring;
    
  } catch (error) {
    console.error('Error checking sponsorship:', error.message);
    return false;
  }
}

// Función original para backward compatibility (mantenemos por si acaso)
export async function isSponsor(access_token, githubUser = process.env.GITHUB_USER) {
  const query = `
    {
      viewer {
        sponsorshipsAsSponsor(first: 100) {
          nodes {
            sponsorable {
              login
            }
          }
        }
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://api.github.com/graphql',
      { query },
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'User-Agent': 'Sponsorcast',
        },
      }
    );

    if (response.data.errors) {
      console.error('GraphQL errors:', response.data.errors);
      return false;
    }

    const sponsors = response.data.data?.viewer?.sponsorshipsAsSponsor?.nodes || [];
    const isSponsoring = sponsors.some(s => s.sponsorable?.login === githubUser);
    
    console.log(`Checking sponsorship for ${githubUser}: ${isSponsoring}`);
    return isSponsoring;
    
  } catch (error) {
    console.error('Error checking sponsorship:', error.message);
    return false;
  }
}

// Nueva función para obtener información del usuario autenticado
export async function getUserInfo(access_token) {
  try {
    const response = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'User-Agent': 'Sponsorcast',
      },
    });
    
    return {
      login: response.data.login,
      name: response.data.name,
      avatar_url: response.data.avatar_url,
    };
  } catch (error) {
    console.error('Error getting user info:', error.message);
    return null;
  }
}
