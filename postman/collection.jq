($openapi[0].components.schemas.LoginDto.properties) as $login
| walk(if type == "object" and has("request") then del(.request.auth) else . end)
| {
    collection: (
      del(.info._postman_id)
      + {
          variable: [
            { key: "baseUrl", value: $baseUrl },
            { key: "email", value: $login.email.example },
            { key: "password", value: $login.password.example }
          ],
          auth: { type: "bearer", bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }] },
          event: [{ listen: "prerequest", script: { type: "text/javascript", exec: ($autoLogin | split("\n")) } }]
        }
    )
  }
