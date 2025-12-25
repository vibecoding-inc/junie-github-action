#!/usr/bin/env bun

import * as github from "@actions/github";
import type {Octokit} from "@octokit/rest";

/**
 * Verifies that the workflow was triggered by a human user, not a bot.
 *
 * This check prevents automation loops where bots trigger workflows that trigger other bots.
 * Only applies to interactive events (comments, issues, PRs) - automated workflows skip this check.
 *
 * Note: Uses github.context.actor directly to get the actual workflow trigger,
 * not the parsed context which contains the commit author (JetBrains Junie).
 *
 * @param octokit - Octokit REST client for GitHub API calls
 * @throws {Error} if actor is a bot (type !== "User")
 * @throws {Error} if unable to fetch actor information from GitHub API
 */
export async function checkHumanActor(
    octokit: Octokit,
): Promise<boolean> {
    const triggerActor = github.context.actor;
    try {
        // Fetch actor information from GitHub API to determine their type (User, Bot)
        const {data: userData} = await octokit.users.getByUsername({
            username: triggerActor,
        });

        const actorType = userData.type;
        console.log(`Actor type: ${actorType}`);

        // Only "User" type is allowed - reject bots and other non-human actors
        if (actorType !== "User") {
            // Remove "[bot]" suffix for cleaner error message (e.g., "dependabot[bot]" -> "dependabot")
            const botName = triggerActor.toLowerCase().replace(/\[bot\]$/, "");
            console.error(
                `❌ Workflow initiated by non-human actor: ${botName} (type: ${actorType}). ` +
                `Junie can only be triggered by human users to prevent automation loops. ` +
                `If you need automated workflows, use workflow_dispatch or scheduled events.`
            );
            return false;
        }

        console.log(`✓ Verified human actor: ${triggerActor}`);
        return true;
    } catch (error) {
        console.error(
            `❌ Failed to verify actor information for "${triggerActor}". ` +
            `This could be due to: \n` +
            `• GitHub API rate limits\n` +
            `• Insufficient token permissions\n` +
            `• Network connectivity issues\n` +
            `Original error: ${error instanceof Error ? error.message : String(error)}`
        );
        return false;
    }
}
