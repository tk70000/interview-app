# Claude Code Configuration

## Important: File Path Handling

When using `mcp__github_file_ops__commit_files`, always use **relative paths** from the repository root:

- ✅ Correct: `src/components/example.tsx`
- ❌ Wrong: `/home/runner/work/interview-app/interview-app/src/components/example.tsx`

### Example:
```javascript
// When committing files, use:
mcp__github_file_ops__commit_files({
  files: ["src/components/new-component.tsx"], // Relative path
  message: "Add new component"
})
```

## Repository Structure
- Always assume you are at the repository root
- Do not use absolute paths for file operations
- When editing files, strip the workspace prefix before committing

<!-- claude-config
file_paths_are_relative: true
-->