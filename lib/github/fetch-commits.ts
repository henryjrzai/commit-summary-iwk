type FetchGithubCommitsParams = {
  owner: string;
  repo: string;
  username: string;
  since: string;
  until: string;
};

export type NormalizedGithubCommit = {
  sha: string;
  message: string;
  authorName: string | null;
  authorEmail: string | null;
  authorLogin: string | null;
  committedAt: Date;
  htmlUrl: string | null;
  owner: string;
  repo: string;
};

type GithubCommitApiResponse = {
  sha?: string;
  html_url?: string;
  commit?: {
    message?: string;
    author?: {
      name?: string;
      email?: string;
      date?: string;
    };
  };
  author?: {
    login?: string;
  } | null;
};

function toIsoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date format. Use ISO date string.");
  }
  return date.toISOString();
}

export async function fetchGithubCommits(
  params: FetchGithubCommitsParams,
): Promise<NormalizedGithubCommit[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN on server environment.");
  }

  const sinceIso = toIsoDate(params.since);
  const untilIso = toIsoDate(params.until);

  const url = new URL(
    `https://api.github.com/repos/${params.owner}/${params.repo}/commits`,
  );
  url.searchParams.set("author", params.username);
  url.searchParams.set("since", sinceIso);
  url.searchParams.set("until", untilIso);
  url.searchParams.set("per_page", "100");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Failed to fetch GitHub commits (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const commits = (await response.json()) as GithubCommitApiResponse[];

  return commits
    .filter((item) => item.sha && item.commit?.message && item.commit.author?.date)
    .map((item) => ({
      sha: item.sha as string,
      message: (item.commit?.message as string).trim(),
      authorName: item.commit?.author?.name ?? null,
      authorEmail: item.commit?.author?.email ?? null,
      authorLogin: item.author?.login ?? null,
      committedAt: new Date(item.commit?.author?.date as string),
      htmlUrl: item.html_url ?? null,
      owner: params.owner,
      repo: params.repo,
    }));
}

