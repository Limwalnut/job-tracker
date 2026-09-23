using System.Security.Claims;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace JobTracker.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/account")]
public sealed class AccountController(
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<AccountResponse>> GetAccount()
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        return Ok(await CreateResponseAsync(user));
    }

    [HttpPatch("profile")]
    public async Task<ActionResult<AccountResponse>> UpdateProfile(
        [FromBody] UpdateProfileRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        user.DisplayName = NormalizeDisplayName(request.DisplayName);
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return IdentityValidationProblem(result);
        }

        return Ok(await CreateResponseAsync(user));
    }

    [HttpPost("password")]
    public async Task<ActionResult<AccountResponse>> ChangePassword(
        [FromBody] ChangePasswordRequest request)
    {
        var user = await GetCurrentUserAsync();
        if (user is null)
        {
            return Unauthorized();
        }

        var hasPassword = await userManager.HasPasswordAsync(user);
        IdentityResult result;

        if (hasPassword)
        {
            if (string.IsNullOrEmpty(request.CurrentPassword))
            {
                return ValidationProblem(new ValidationProblemDetails(
                    new Dictionary<string, string[]>
                    {
                        ["CurrentPassword"] = ["Enter your current password."]
                    }));
            }

            result = await userManager.ChangePasswordAsync(
                user,
                request.CurrentPassword,
                request.NewPassword);
        }
        else
        {
            result = await userManager.AddPasswordAsync(user, request.NewPassword);
        }

        if (!result.Succeeded)
        {
            return IdentityValidationProblem(result);
        }

        await signInManager.RefreshSignInAsync(user);
        return Ok(await CreateResponseAsync(user));
    }

    private async Task<ApplicationUser?> GetCurrentUserAsync()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return userId is null ? null : await userManager.FindByIdAsync(userId);
    }

    private async Task<AccountResponse> CreateResponseAsync(ApplicationUser user)
    {
        var logins = await userManager.GetLoginsAsync(user);
        return new AccountResponse(
            user.Id,
            user.Email ?? string.Empty,
            user.DisplayName,
            await userManager.HasPasswordAsync(user),
            logins.Any(login => login.LoginProvider == "Google"));
    }

    private ActionResult IdentityValidationProblem(IdentityResult result)
    {
        var errors = result.Errors
            .GroupBy(error => error.Code)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.Description).ToArray());
        return ValidationProblem(new ValidationProblemDetails(errors));
    }

    private static string? NormalizeDisplayName(string? displayName)
    {
        var normalized = displayName?.Trim();
        return string.IsNullOrEmpty(normalized) ? null : normalized;
    }
}
