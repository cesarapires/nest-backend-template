const AUTH_PATH = '/api/v1/auth/';
const RENEW_BEFORE_MS = 30 * 1000;

const isAuthRequest = pm.request.url.getPath().startsWith(AUTH_PATH);
const hasEnvironment = Boolean(pm.environment.name);
const savedToken = hasEnvironment ? pm.environment.get('accessToken') : undefined;
const expiresAt = Number((hasEnvironment && pm.environment.get('accessTokenExpiresAt')) || 0);
const needsLogin = !savedToken || Date.now() > expiresAt - RENEW_BEFORE_MS;

if (!isAuthRequest && needsLogin) {
  pm.sendRequest(
    {
      url: `${pm.variables.get('baseUrl')}${AUTH_PATH}login`,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      body: { mode: 'raw', raw: JSON.stringify({ email: pm.variables.get('email'), password: pm.variables.get('password') }) },
    },
    (error, response) => {
      if (error || response.code !== 200) {
        console.error('Login automático falhou', error ?? response.text());
        return;
      }

      const tokens = response.json();
      pm.variables.set('accessToken', tokens.accessToken);

      if (hasEnvironment) {
        pm.environment.set('accessToken', tokens.accessToken);
        pm.environment.set('accessTokenExpiresAt', String(Date.now() + tokens.accessTokenExpiresIn * 1000));
      }
    },
  );
}
