import { 
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';

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
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: redirectUri
    });


    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange code for tokens: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const responseData = await response.json();
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
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      given_name: payload.given_name as string | undefined,
      family_name: payload.family_name as string | undefined,
      picture: payload.picture as string | undefined
    };
  }

  // Email Authentication Methods
  async signUpWithEmail(email: string, password: string): Promise<{ userSub: string }> {
    try {
      const command = new SignUpCommand({
        ClientId: this.config.clientId,
        Username: email,
        Password: password,
        UserAttributes: []
      });

      const response = await this.client.send(command);
      return { userSub: response.UserSub || '' };
    } catch (error) {
      console.error('Error signing up with email:', error);
      throw error;
    }
  }

  async confirmSignUp(email: string, confirmationCode: string): Promise<void> {
    try {
      const command = new ConfirmSignUpCommand({
        ClientId: this.config.clientId,
        Username: email,
        ConfirmationCode: confirmationCode
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error confirming sign up:', error);
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<{ accessToken: string; idToken: string; refreshToken: string }> {
    try {
      const command = new InitiateAuthCommand({
        ClientId: this.config.clientId,
        AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password
        }
      });

      const response = await this.client.send(command);
      
      if (!response.AuthenticationResult) {
        throw new Error('Authentication failed');
      }

      return {
        accessToken: response.AuthenticationResult.AccessToken || '',
        idToken: response.AuthenticationResult.IdToken || '',
        refreshToken: response.AuthenticationResult.RefreshToken || ''
      };
    } catch (error) {
      console.error('Error signing in with email:', error);
      throw error;
    }
  }

  async resendConfirmationCode(email: string): Promise<void> {
    try {
      const command = new ResendConfirmationCodeCommand({
        ClientId: this.config.clientId,
        Username: email
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error resending confirmation code:', error);
      throw error;
    }
  }

  // Password Reset Methods
  async forgotPassword(email: string): Promise<void> {
    try {
      const command = new ForgotPasswordCommand({
        ClientId: this.config.clientId,
        Username: email
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error initiating password reset:', error);
      throw error;
    }
  }

  async confirmForgotPassword(email: string, confirmationCode: string, newPassword: string): Promise<void> {
    try {
      const command = new ConfirmForgotPasswordCommand({
        ClientId: this.config.clientId,
        Username: email,
        ConfirmationCode: confirmationCode,
        Password: newPassword
      });

      await this.client.send(command);
    } catch (error) {
      console.error('Error confirming password reset:', error);
      throw error;
    }
  }
}

const cognitoConfig: CognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1'
};

export const cognitoAuth = new CognitoAuth(cognitoConfig);
