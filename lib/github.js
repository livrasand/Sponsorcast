import axios from 'axios';

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
