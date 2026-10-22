using JobTracker.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace JobTracker.Api.Services;

public sealed class PersonalApiTokenUserManager(
    IUserStore<ApplicationUser> store,
    IOptions<IdentityOptions> optionsAccessor,
    IPasswordHasher<ApplicationUser> passwordHasher,
    IEnumerable<IUserValidator<ApplicationUser>> userValidators,
    IEnumerable<IPasswordValidator<ApplicationUser>> passwordValidators,
    ILookupNormalizer keyNormalizer,
    IdentityErrorDescriber errors,
    IServiceProvider services,
    ILogger<UserManager<ApplicationUser>> logger,
    PersonalApiTokenService tokenService)
    : UserManager<ApplicationUser>(
        store,
        optionsAccessor,
        passwordHasher,
        userValidators,
        passwordValidators,
        keyNormalizer,
        errors,
        services,
        logger)
{
    public override async Task<IdentityResult> ChangePasswordAsync(
        ApplicationUser user,
        string currentPassword,
        string newPassword)
    {
        var result = await base.ChangePasswordAsync(user, currentPassword, newPassword);
        if (result.Succeeded)
        {
            await tokenService.RevokeAllAsync(user.Id);
        }

        return result;
    }

    public override async Task<IdentityResult> ResetPasswordAsync(
        ApplicationUser user,
        string token,
        string newPassword)
    {
        var result = await base.ResetPasswordAsync(user, token, newPassword);
        if (result.Succeeded)
        {
            await tokenService.RevokeAllAsync(user.Id);
        }

        return result;
    }

    public override async Task<IdentityResult> AddPasswordAsync(
        ApplicationUser user,
        string password)
    {
        var result = await base.AddPasswordAsync(user, password);
        if (result.Succeeded)
        {
            await tokenService.RevokeAllAsync(user.Id);
        }

        return result;
    }
}
