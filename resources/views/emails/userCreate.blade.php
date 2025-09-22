<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Informations de connexion</title>
<style>
  /* Styles de fallback pour certains clients */
  @media (max-width: 600px) { .container { width: 100% !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fb;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 18px rgba(17,24,39,0.08);">
          <tr>
            <td style="background:#0ea5e9;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;line-height:1.4;color:#ffffff;">{{ config('app.name') }}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px 24px;">
              @php
                $name = data_get($user, 'name') ?? data_get($user, 'prenom') ?? data_get($user, 'first_name') ?? null;
                $displayName = $name ?: data_get($user, 'email');
                $email = data_get($user, 'email');
                $loginUrl = "https://cofiexpressga.cofinaonline.com/login";
              @endphp
              <p style="margin:0 0 12px 0;font-size:16px;color:#111827;">Bonjour {{ $displayName }},</p>
              <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">Votre compte a été créé avec succès sur <strong>{{ config('app.name') }}</strong>. Vous trouverez ci‑dessous vos informations de connexion.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#4b5563;">
                      <span style="display:inline-block;width:110px;color:#6b7280;">Email</span>
                      <strong style="color:#111827;">{{ $email }}</strong>
                      <br>
                    </p>

                      <p style="margin:0;font-size:14px;color:#4b5563;">
                        <span style="display:inline-block;width:110px;color:#6b7280;">Mot de passe</span>
                        <strong style="color:#111827;">{{ $password }}</strong>
                      </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;">
              <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">Cliquez sur le bouton ci‑dessous pour accéder à votre espace et vous connecter. Pour des raisons de sécurité, nous vous recommandons de modifier votre mot de passe lors de votre première connexion.</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="#0ea5e9" style="border-radius:8px;">
                    <a href="{{ $loginUrl }}" style="display:inline-block;padding:12px 22px;font-size:14px;color:#ffffff;text-decoration:none;font-weight:bold;border-radius:8px;background:#0ea5e9;">Se connecter</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 24px 24px;">
              <p style="margin:0;font-size:12px;color:#6b7280;">Si vous n’êtes pas à l’origine de cette création de compte, ignorez cet e‑mail ou contactez le support.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f3f4f6;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#6b7280;">&copy; {{ date('Y') }} {{ config('app.name') }}. Tous droits réservés.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
