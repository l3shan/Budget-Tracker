# Contributing to BudgetBuddy

Thank you for your interest in contributing to BudgetBuddy! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Please be respectful and constructive in all interactions with other contributors and maintainers.

## How to Contribute

### 1. Fork and Clone
```bash
git clone https://github.com/YOUR-USERNAME/Budget-Tracker.git
cd Budget-Tracker
```

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:
- `feature/new-feature-name` for new features
- `bugfix/issue-description` for bug fixes
- `docs/documentation-update` for documentation changes

### 3. Make Your Changes

#### Areas for Contribution

The README highlights several areas where improvements are needed:

- **Unify Frontend & Backend**: Consolidate the browser local-storage flow with the API-backed server model
- **Persistent Session Store**: Add a production-ready session store for multi-instance deployments
- **Automated Tests**: Add test coverage for API and database workflows
- **Code Refactoring**: Improve code organization and maintainability
- **Bug Fixes**: Report and fix any issues you encounter
- **Documentation**: Improve README, API docs, or add code comments

### 4. Code Style Guidelines

- Write clean, readable code
- Add comments for complex logic
- Follow the existing code style in the repository
- Test your changes locally before submitting a PR

### 5. Commit and Push

```bash
git add .
git commit -m "Clear description of your changes"
git push origin feature/your-feature-name
```

**Important:** Ensure your Git config uses your GitHub account:
```bash
git config user.email "your-github-email@example.com"
git config user.name "Your GitHub Username"
```

### 6. Create a Pull Request

1. Go to https://github.com/l3shan/Budget-Tracker
2. Click "New Pull Request"
3. Select your branch and write a clear PR description
4. Submit for review

## Local Development

### Prerequisites
- Node.js (latest LTS version)
- npm

### Setup
```bash
npm install
npm start
```

The server runs on `http://localhost:3000`

### Testing
Before submitting a PR:
- Test your changes thoroughly
- Verify no existing functionality is broken
- Check the browser console for errors

## Reporting Issues

If you find a bug or have a feature request:
1. Check existing issues to avoid duplicates
2. Open a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Screenshots/logs if applicable

## Pull Request Process

1. Ensure your PR description clearly explains the changes
2. Link any related issues
3. Wait for maintainer review
4. Address any feedback or requested changes
5. Once approved, your PR will be merged

## Recognition

All contributors are recognized in the repository's contributor graph. Thank you for helping improve BudgetBuddy! 🎉

## Questions?

Feel free to open an issue or discussion if you have questions about contributing.
