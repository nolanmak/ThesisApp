import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';

export interface CognitoConfig {
  userPoolId: string;
  clientId: string;
  domain: string;
  region: string;
}

export interface AuthUser {
  sub: string;
  email: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

class CognitoAuth {
  private config: CognitoConfig;
  private client: CognitoIdentityProviderClient;

  constructor(config: CognitoConfig) {
    this.config = config;
    this.client = new CognitoIdentityProviderClient({ region: config.region });
  }

  getSignInUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      scope: 'email openid profile',
      identity_provider: 'Google'
    });

    return `https://${this.config.domain}/oauth2/authorize?${params.toString()}`;
  }

  getSignOutUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      logout_uri: redirectUri
    });

    return `https://${this.config.domain}/logout?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<Record<string, unknown>> {
    const tokenEndpoint = `https://${this.config.domain}/oauth2/token`;
    console.log('Token exchange debug info:');
    console.log('- tokenEndpoint:', tokenEndpoint);
    console.log('- client_id:', this.config.clientId);
    console.log('- code:', code);
    console.log('- redirect_uri:', redirectUri);
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: redirectUri
    });

    console.log('- request body:', params.toString());

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    console.log('- response status:', response.status);
    console.log('- response statusText:', response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('- error response body:', errorText);
      throw new Error(`Failed to exchange code for tokens: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('- successful response:', responseData);
    return responseData;
  }

  parseJWT(token: string): Record<string, unknown> {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  }

  getUserFromIdToken(idToken: string): AuthUser {
    const payload = this.parseJWT(idToken);
    console.log('payload', payload);
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      given_name: payload.given_name as string | undefined,
      family_name: payload.family_name as string | undefined,
      picture: payload.picture as string | undefined
    };
  }
}

const cognitoConfig: CognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
};

export const cognitoAuth = new CognitoAuth(cognitoConfig);
