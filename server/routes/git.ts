import type { IncomingMessage, ServerResponse } from 'http';
import { jsonResponse, sendError, getParam, parseBody } from '../lib/utils.js';
import {
  getWorkspaceGitStatus,
  getWorkspaceGitStatusDirect,
  getFileDiff,
  revertFile,
} from '../lib/git.js';
import { getThreadGitActivity } from '../lib/git-activity.js';

export async function handleGitRoutes(
  url: URL,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathname = url.pathname;

  if (pathname === '/api/thread-git-activity') {
    try {
      const threadId = getParam(url, 'threadId');
      const refresh = url.searchParams.get('refresh') === '1';
      const activity = await getThreadGitActivity(threadId, refresh);
      return jsonResponse(res, activity);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('required') ? 400 : 500;
      return sendError(res, status, message);
    }
  }

  if (pathname === '/api/git-status') {
    try {
      const threadId = getParam(url, 'threadId');
      const gitStatus = await getWorkspaceGitStatus(threadId);
      return jsonResponse(res, gitStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('required') ? 400 : 500;
      return sendError(res, status, message);
    }
  }

  if (pathname === '/api/workspace-git-status') {
    try {
      const workspacePath = getParam(url, 'workspace');
      const gitStatus = await getWorkspaceGitStatusDirect(workspacePath);
      return jsonResponse(res, gitStatus);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('required') ? 400 : 500;
      return sendError(res, status, message);
    }
  }

  if (pathname === '/api/file-diff') {
    try {
      const filePath = getParam(url, 'path');
      const workspacePath = getParam(url, 'workspace');
      const diff = await getFileDiff(filePath, workspacePath);
      return jsonResponse(res, diff);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('required') ? 400 : 500;
      return sendError(res, status, message);
    }
  }

  if (pathname === '/api/git-revert-file') {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method not allowed');
    }
    try {
      const body = await parseBody<{
        workspacePath?: string;
        filePath?: string;
        created?: boolean;
      }>(req);
      if (!body.workspacePath) throw new Error('workspacePath required');
      if (!body.filePath) throw new Error('filePath required');
      const result = await revertFile(body.workspacePath, body.filePath, !!body.created);
      if (!result.success) {
        return sendError(res, 500, result.error || 'Failed to revert file');
      }
      return jsonResponse(res, { success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const status = message.includes('required') || message.includes('Invalid') ? 400 : 500;
      return sendError(res, status, message);
    }
  }

  return false;
}
