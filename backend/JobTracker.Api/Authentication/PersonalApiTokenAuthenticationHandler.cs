using System.Security.Claims;
using System.Text.Encodings.Web;
using JobTracker.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace JobTracker.Api.Authentication;

public sealed class PersonalApiTokenAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    PersonalApiTokenService tokenService)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authorization = Request.Headers.Authorization.ToString();
        const string bearerPrefix = "Bearer ";
        if (!authorization.StartsWith(bearerPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        var tokenValue = authorization[bearerPrefix.Length..].Trim();
        if (!tokenValue.StartsWith(PersonalApiTokenClaims.Prefix, StringComparison.Ordinal))
        {
            return AuthenticateResult.NoResult();
        }

        var secret = tokenValue[PersonalApiTokenClaims.Prefix.Length..];
        if (secret.Length != 43 ||
            secret.Any(character =>
                !(character is >= 'A' and <= 'Z' or >= 'a' and <= 'z' or >= '0' and <= '9' or '-' or '_')))
        {
            return AuthenticateResult.Fail("Invalid personal API token.");
        }

        var updateLastUsed = Context.GetEndpoint()?.Metadata
            .GetMetadata<AllowPersonalApiTokenAttribute>() is not null;
        var token = await tokenService.FindActiveAsync(
            secret,
            updateLastUsed,
            Context.RequestAborted);
        if (token is null)
        {
            return AuthenticateResult.Fail("Invalid personal API token.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, token.UserId),
            new Claim(PersonalApiTokenClaims.AuthenticationMethod, PersonalApiTokenClaims.PersonalToken),
            new Claim(PersonalApiTokenClaims.TokenId, token.Id.ToString("D"))
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);
        return AuthenticateResult.Success(ticket);
    }
}
