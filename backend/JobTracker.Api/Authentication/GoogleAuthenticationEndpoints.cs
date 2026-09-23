using System.Security.Claims;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;

namespace JobTracker.Api.Authentication;

public static class GoogleAuthenticationEndpoints
{
    public static RouteGroupBuilder MapGoogleAuthentication(
        this RouteGroupBuilder auth,
        bool googleAuthenticationEnabled,
        string? frontendBaseUrl)
    {
        auth.MapGet("/google", (
            HttpContext context,
            SignInManager<ApplicationUser> signInManager) =>
        {
            if (!googleAuthenticationEnabled)
            {
                return Results.Redirect(CreateFrontendUrl(
                    context,
                    frontendBaseUrl,
                    "/login?googleError=not_configured"));
            }

            var callbackUrl = "/api/auth/google/callback";
            var properties = signInManager.ConfigureExternalAuthenticationProperties(
                "Google",
                callbackUrl);

            return Results.Challenge(properties, ["Google"]);
        }).AllowAnonymous();

        auth.MapGet("/google/callback", async (
            HttpContext context,
            SignInManager<ApplicationUser> signInManager,
            UserManager<ApplicationUser> userManager) =>
        {
            if (!googleAuthenticationEnabled)
            {
                return Results.Redirect(CreateFrontendUrl(
                    context,
                    frontendBaseUrl,
                    "/login?googleError=not_configured"));
            }

            var loginInfo = await signInManager.GetExternalLoginInfoAsync();
            if (loginInfo is null)
            {
                return Results.Redirect(CreateFrontendUrl(
                    context,
                    frontendBaseUrl,
                    "/login?googleError=authentication_failed"));
            }

            var signInResult = await signInManager.ExternalLoginSignInAsync(
                loginInfo.LoginProvider,
                loginInfo.ProviderKey,
                isPersistent: true,
                bypassTwoFactor: true);

            if (signInResult.Succeeded)
            {
                await context.SignOutAsync(IdentityConstants.ExternalScheme);
                return Results.Redirect(CreateFrontendUrl(
                    context,
                    frontendBaseUrl,
                    "/applications"));
            }

            if (signInResult.IsLockedOut)
            {
                return Results.Redirect(CreateFrontendUrl(
                    context,
                    frontendBaseUrl,
                    "/login?googleError=locked_out"));
            }

            var email = loginInfo.Principal.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrWhiteSpace(email))
            {
                return Results.Redirect(CreateFrontendUrl(
                    context,
                    frontendBaseUrl,
                    "/login?googleError=email_unavailable"));
            }

            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                var displayName = loginInfo.Principal.FindFirstValue(ClaimTypes.Name)?.Trim();
                user = new ApplicationUser
                {
                    UserName = email,
                    Email = email,
                    EmailConfirmed = true,
                    DisplayName = string.IsNullOrEmpty(displayName)
                        ? null
                        : displayName[..Math.Min(displayName.Length, 80)]
                };

                var createResult = await userManager.CreateAsync(user);
                if (!createResult.Succeeded)
                {
                    return Results.Redirect(CreateFrontendUrl(
                        context,
                        frontendBaseUrl,
                        "/login?googleError=account_creation_failed"));
                }
            }
            else if (!user.EmailConfirmed)
            {
                user.EmailConfirmed = true;
                var updateResult = await userManager.UpdateAsync(user);
                if (!updateResult.Succeeded)
                {
                    return Results.Redirect(CreateFrontendUrl(
                        context,
                        frontendBaseUrl,
                        "/login?googleError=account_link_failed"));
                }
            }

            var addLoginResult = await userManager.AddLoginAsync(user, loginInfo);
            if (!addLoginResult.Succeeded)
            {
                return Results.Redirect(CreateFrontendUrl(
                    context,
                    frontendBaseUrl,
                    "/login?googleError=account_link_failed"));
            }

            await signInManager.SignInAsync(
                user,
                isPersistent: true,
                authenticationMethod: loginInfo.LoginProvider);
            await context.SignOutAsync(IdentityConstants.ExternalScheme);

            return Results.Redirect(CreateFrontendUrl(
                context,
                frontendBaseUrl,
                "/applications"));
        }).AllowAnonymous();

        return auth;
    }

    public static string CreateFrontendUrl(
        HttpContext context,
        string? frontendBaseUrl,
        string pathAndQuery)
    {
        if (Uri.TryCreate(frontendBaseUrl, UriKind.Absolute, out var baseUri))
        {
            return new Uri(baseUri, pathAndQuery).ToString();
        }

        return pathAndQuery;
    }
}
