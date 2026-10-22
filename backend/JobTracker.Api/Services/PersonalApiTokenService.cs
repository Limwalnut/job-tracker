using System.Data;
using System.Security.Cryptography;
using System.Text;
using JobTracker.Api.Authentication;
using JobTracker.Api.Data;
using JobTracker.Api.DTOs;
using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Options;

namespace JobTracker.Api.Services;

public sealed class PersonalApiTokenService(
    AppDbContext dbContext,
    IOptions<PersonalApiTokenOptions> options)
{
    public const int LastUsedUpdateIntervalMinutes = 5;

    public async Task<(PersonalApiToken Token, string Secret)> CreateAsync(
        ApplicationUser user,
        string name,
        DateTimeOffset? expiresAtUtc,
        CancellationToken cancellationToken)
    {
        var normalizedName = name.Trim();
        if (normalizedName.Length is 0 or > 100)
        {
            throw new ArgumentException("Name must be between 1 and 100 characters.", nameof(name));
        }

        await using var transaction = dbContext.Database.IsNpgsql()
            ? await dbContext.Database.BeginTransactionAsync(
                IsolationLevel.ReadCommitted,
                cancellationToken)
            : await dbContext.Database.BeginTransactionAsync(cancellationToken);

        if (dbContext.Database.IsNpgsql())
        {
            await dbContext.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock(hashtextextended({user.Id}, 0))",
                cancellationToken);
        }

        var now = DateTimeOffset.UtcNow;
        if (expiresAtUtc is not null && expiresAtUtc <= now)
        {
            throw new ArgumentOutOfRangeException(
                nameof(expiresAtUtc),
                "Expiry must be in the future.");
        }

        var existingTokens = await dbContext.PersonalApiTokens
            .AsNoTracking()
            .Where(token => token.UserId == user.Id && token.RevokedAtUtc == null)
            .ToListAsync(cancellationToken);
        var activeCount = existingTokens.Count(token =>
            token.ExpiresAtUtc is null || token.ExpiresAtUtc > now);

        if (activeCount >= options.Value.MaxActiveTokens)
        {
            throw new PersonalApiTokenLimitException(options.Value.MaxActiveTokens);
        }

        var secret = Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(
            RandomNumberGenerator.GetBytes(32));
        var secretHash = HashSecret(secret);
        var token = new PersonalApiToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Name = normalizedName,
            SecretHash = secretHash,
            DisplayPrefix = $"{PersonalApiTokenClaims.Prefix}{secret[..4]}…",
            CreatedAtUtc = now,
            ExpiresAtUtc = expiresAtUtc
        };

        dbContext.PersonalApiTokens.Add(token);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        return (token, $"{PersonalApiTokenClaims.Prefix}{secret}");
    }

    public async Task<List<PersonalApiTokenResponse>> ListAsync(
        string userId,
        CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);
        if (user is null)
        {
            return [];
        }

        var tokens = await dbContext.PersonalApiTokens
            .AsNoTracking()
            .Where(token => token.UserId == userId)
            .ToListAsync(cancellationToken);

        return tokens
            .OrderByDescending(token => token.CreatedAtUtc)
            .Select(ToResponse)
            .ToList();
    }

    public async Task<bool> RevokeAsync(
        string userId,
        Guid tokenId,
        CancellationToken cancellationToken)
    {
        var token = await dbContext.PersonalApiTokens
            .SingleOrDefaultAsync(
                candidate => candidate.Id == tokenId && candidate.UserId == userId,
                cancellationToken);
        if (token is null)
        {
            return false;
        }

        token.RevokedAtUtc ??= DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<PersonalApiToken?> FindActiveAsync(
        string secret,
        bool updateLastUsed,
        CancellationToken cancellationToken)
    {
        var token = await dbContext.PersonalApiTokens
            .AsNoTracking()
            .Include(candidate => candidate.User)
            .SingleOrDefaultAsync(
                candidate => candidate.SecretHash == HashSecret(secret),
                cancellationToken);
        var now = DateTimeOffset.UtcNow;
        if (token is null ||
            token.RevokedAtUtc is not null ||
            token.ExpiresAtUtc is not null && token.ExpiresAtUtc <= now ||
            token.User.DisabledAtUtc is not null)
        {
            return null;
        }

        if (updateLastUsed && (token.LastUsedAtUtc is null ||
            token.LastUsedAtUtc < now.AddMinutes(-LastUsedUpdateIntervalMinutes))
           )
        {
            await dbContext.PersonalApiTokens
                .Where(candidate => candidate.Id == token.Id)
                .ExecuteUpdateAsync(
                    setters => setters.SetProperty(candidate => candidate.LastUsedAtUtc, now),
                    cancellationToken);
            token.LastUsedAtUtc = now;
        }

        return token;
    }

    public async Task RevokeAllAsync(
        string userId,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        await dbContext.PersonalApiTokens
            .Where(token => token.UserId == userId && token.RevokedAtUtc == null)
            .ExecuteUpdateAsync(
                setters => setters.SetProperty(token => token.RevokedAtUtc, now),
                cancellationToken);
    }

    public static string HashSecret(string secret)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(secret));
        return Convert.ToHexString(hash);
    }

    private static PersonalApiTokenResponse ToResponse(PersonalApiToken token)
    {
        var status = token.RevokedAtUtc is not null
            ? "revoked"
            : token.ExpiresAtUtc is not null && token.ExpiresAtUtc <= DateTimeOffset.UtcNow
                ? "expired"
                : "active";

        return new PersonalApiTokenResponse(
            token.Id,
            token.Name,
            token.DisplayPrefix,
            token.CreatedAtUtc,
            token.ExpiresAtUtc,
            token.LastUsedAtUtc,
            token.RevokedAtUtc,
            status);
    }
}
