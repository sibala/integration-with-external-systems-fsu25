// "Report a problem" in the admin panel: an issue in the shop's GitHub repo, created with the SHOP'S token.
import { Router } from 'express'
import { createIssue, listOpenIssues } from '../integrations/githubAdapter.ts'
import { requireAdmin } from '../middleware/auth.ts'

const router = Router()


/* --- GET /api/admin/issues → the open issues in the shop's repo --- */
router.get('/', requireAdmin, async (_req, res) => {
  try {
    res.json(await listOpenIssues())
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'Could not get the issues from GitHub' })
  }
})

/* --- POST /api/admin/issues  { title, description } → the new issue --- */
// In your shop: validate the body with Zod.
router.post('/', requireAdmin, async (req, res) => {
  const { title, description } = req.body
  try {
    // GitHub shows the shop's account as the author – so the server writes who reported it
    const issue = await createIssue(title, `${description}\n\n---\nReported by @${res.locals.admin.login} in the admin panel.`)
    console.log(`[GITHUB] ${res.locals.admin.login} created issue #${issue.number}`)
    res.status(201).json(issue)
  } catch (err) {
    console.error(err)
    res.status(502).json({ error: 'GitHub did not create the issue. Check GITHUB_ISSUES_TOKEN and GITHUB_REPO.' })
  }
})

export default router
