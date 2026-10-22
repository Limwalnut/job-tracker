namespace JobTracker.Api.Authentication;

public static class PersonalApiTokenClaims
{
    public const string AuthenticationMethod = "auth_method";
    public const string PersonalToken = "pat";
    public const string TokenId = "personal_api_token_id";
    public const string Scheme = "PersonalApiToken";
    public const string PolicyScheme = "ApplylineAuth";
    public const string Prefix = "apl_pat_";
    public const string BearerScheme = "Bearer";
}
