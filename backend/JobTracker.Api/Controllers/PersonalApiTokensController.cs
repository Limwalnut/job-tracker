using System.Security.Claims;
using JobTracker.Api.Authentication;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using JobTracker.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace JobTracker.Api.Controllers;

[ApiController]
[Route("api/account/tokens")]
[Authorize(AuthenticationSchemes = "Identity.Application")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class PersonalApiTokensController(
    UserManager<ApplicationUser> userManager,
    PersonalApiTokenService tokenService) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PersonalApiTokenResponse>>> List(
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        return Ok(await tokenService.ListAsync(userId, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<PersonalApiTokenResponse>> Create(
        [FromBody] CreatePersonalApiTokenRequest request,
        CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = userId is null ? null : await userManager.FindByIdAsync(userId);
        if (user is null)
        {
            return Unauthorized();
        }

        var name = request.Name.Trim();
        if (name.Length is 0 or > 100)
        {
            ModelState.AddModelError(nameof(request.Name), "Name must be between 1 and 100 characters.");
            return ValidationProblem(ModelState);
        }

        var expiresAtUtc = request.ExpiresAt?.ToUniversalTime();
        if (expiresAtUtc is not null && expiresAtUtc <= DateTimeOffset.UtcNow)
        {
            ModelState.AddModelError(nameof(request.ExpiresAt), "Expiry must be in the future.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var (token, secret) = await tokenService.CreateAsync(
                user,
                name,
                expiresAtUtc,
                cancellationToken);
            var response = new PersonalApiTokenResponse(
                token.Id,
                token.Name,
                token.DisplayPrefix,
                token.CreatedAtUtc,
                token.ExpiresAtUtc,
                token.LastUsedAtUtc,
                token.RevokedAtUtc,
                "active",
                secret);
            return CreatedAtAction(nameof(List), response);
        }
        catch (PersonalApiTokenLimitException exception)
        {
            return Conflict(new
            {
                code = "token_limit_reached",
                maxActiveTokens = exception.Maximum
            });
        }
        catch (ArgumentOutOfRangeException exception)
            when (exception.ParamName == "expiresAtUtc")
        {
            ModelState.AddModelError(nameof(request.ExpiresAt), "Expiry must be in the future.");
            return ValidationProblem(ModelState);
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null)
        {
            return Unauthorized();
        }

        return await tokenService.RevokeAsync(userId, id, cancellationToken)
            ? NoContent()
            : NotFound();
    }
}
