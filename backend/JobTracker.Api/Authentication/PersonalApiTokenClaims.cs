namespace JobTracker.Api.Authentication;

public static class PersonalApiTokenClaims
{
    // AddIdentityApiEndpoints registers this composite scheme, but its constant is internal.
    public const string IdentityBearerAndApplicationScheme = "Identity.BearerAndApplication";
    public const string AuthenticationMethod = "auth_method";
    public const string PersonalToken = "pat";
    public const string TokenId = "personal_api_token_id";
    public const string Scheme = "PersonalApiToken";
    public const string PolicyScheme = "ApplylineAuth";
    // IdentityConstants.ApplicationScheme is a non-constant API value and cannot be used in AuthorizeAttribute.
    public const string IdentityApplicationScheme = "Identity.Application";
    public const string Prefix = "apl_pat_";
    public const string BearerScheme = "Bearer";

    public static bool TryGetBearerToken(string authorization, out string token)
    {
        const string bearerPrefix = "Bearer ";
        if (authorization.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            token = authorization[bearerPrefix.Length..].Trim();
            return true;
        }

        token = string.Empty;
        return false;
    }

    public static bool TryGetPersonalBearerToken(string authorization, out string token)
    {
        if (TryGetBearerToken(authorization, out token) &&
            token.StartsWith(Prefix, StringComparison.Ordinal))
        {
            token = token[Prefix.Length..];
            return true;
        }

        token = string.Empty;
        return false;
    }
}
