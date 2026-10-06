import { GitHubConfig, AppData } from '../types';

export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToUtf8(base64: string): string {
  const cleanBase64 = base64.replace(/\s/g, '');
  const binary = atob(cleanBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export interface FetchResult {
  data: AppData | null;
  sha?: string;
  isNewFile: boolean;
}

export class GitHubService {
  private static getHeaders(token: string) {
    return {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept': 'application/vnd.github.v3+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verify repo access and permissions
   */
  static async verifyConnection(config: GitHubConfig): Promise<{ success: boolean; repoName?: string; error?: string }> {
    if (!config.token || !config.owner || !config.repo) {
      return { success: false, error: '请先填写完整的 Token、所有者 (Owner) 与仓库名 (Repo)' };
    }

    try {
      const url = `https://api.github.com/repos/${encodeURIComponent(config.owner.trim())}/${encodeURIComponent(config.repo.trim())}`;
      const res = await fetch(url, {
        headers: this.getHeaders(config.token),
        cache: 'no-store',
      });

      if (res.status === 401) {
        return { success: false, error: 'Token 无效或已过期 (401 Unauthorized)' };
      }
      if (res.status === 404) {
        return { success: false, error: `仓库 ${config.owner}/${config.repo} 未找到或当前 Token 无权访问 (404 Not Found)` };
      }
      if (!res.ok) {
        const errorText = await res.text();
        return { success: false, error: `GitHub API 错误 (${res.status}): ${errorText}` };
      }

      const repoInfo = await res.json();
      return {
        success: true,
        repoName: repoInfo.full_name,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '网络连接失败，请检查网络或代理设置',
      };
    }
  }

  /**
   * Fetch data.json from GitHub repo
   */
  static async fetchRemoteData(config: GitHubConfig): Promise<FetchResult> {
    const filePath = (config.path || 'data.json').replace(/^\/+/, '');
    const branch = config.branch || 'main';
    const url = `https://api.github.com/repos/${encodeURIComponent(config.owner.trim())}/${encodeURIComponent(config.repo.trim())}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;

    const res = await fetch(url, {
      headers: this.getHeaders(config.token),
      cache: 'no-store',
    });

    if (res.status === 404) {
      // File does not exist yet on repo, will create when first saved
      return { data: null, isNewFile: true };
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(err.message || `拉取失败 HTTP ${res.status}`);
    }

    const json = await res.json();
    if (!json.content) {
      throw new Error('未获取到文件内容');
    }

    const decoded = base64ToUtf8(json.content);
    const parsedData = JSON.parse(decoded) as AppData;
    return {
      data: parsedData,
      sha: json.sha,
      isNewFile: false,
    };
  }

  /**
   * Save (commit & push) data.json to GitHub repo
   */
  static async saveRemoteData(
    config: GitHubConfig,
    data: AppData,
    currentSha?: string,
    commitMessage = 'Update work logs & milestones via WorkPulse'
  ): Promise<{ sha: string }> {
    const filePath = (config.path || 'data.json').replace(/^\/+/, '');
    const branch = config.branch || 'main';
    const url = `https://api.github.com/repos/${encodeURIComponent(config.owner.trim())}/${encodeURIComponent(config.repo.trim())}/contents/${filePath}`;

    const jsonString = JSON.stringify(data, null, 2);
    const base64Content = utf8ToBase64(jsonString);

    const body: Record<string, any> = {
      message: commitMessage,
      content: base64Content,
      branch: branch,
    };

    if (currentSha) {
      body.sha = currentSha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      headers: this.getHeaders(config.token),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      if (res.status === 409) {
        throw new Error('检测到版本冲突 (409 Conflict)：远程文件已被其他客户端更改，请先拉取最新数据。');
      }
      throw new Error(err.message || `提交失败 HTTP ${res.status}`);
    }

    const result = await res.json();
    return {
      sha: result.content?.sha || '',
    };
  }
}
