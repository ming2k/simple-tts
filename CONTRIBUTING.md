# Contributing to Simple TTS

We welcome contributions! Here's how you can help:

## Areas Needing Help
- **Chrome Web Store Publishing**: Help package and publish to Chrome Web Store
- **Internationalization**: Translate the extension to more languages
- **UI/UX Improvements**: Enhance the user interface and experience
- **Documentation**: Improve docs, add tutorials, create videos
- **Bug Reports**: Test and report issues
- **Feature Requests**: Suggest and implement new features

## Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Code** your changes following the existing style
4. **Test** your changes: `npm run build && npm run lint`
5. **Commit** with a clear message: `git commit -m 'Add amazing feature'`
6. **Push** to your fork: `git push origin feature/amazing-feature`
7. **Open** a Pull Request

## Development Setup

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed development setup instructions.

## Reporting Issues

Found a bug? Please [open an issue](https://github.com/mingsterism/simple-tts/issues) with:
- Browser version and extension version
- Steps to reproduce the issue
- Expected vs actual behavior
- Console errors (if any)

## Code Style

- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add comments for complex logic
- Run `npm run lint` and `npm run format` before committing

## Testing

- Test your changes in both Firefox and Chrome (if applicable)
- Verify extension works with different Azure voice configurations
- Test accessibility features
- Check that all existing functionality still works

## Pull Request Guidelines

- Keep PRs focused on a single feature or bug fix
- Include a clear description of changes
- Reference any related issues
- Update documentation if needed
- Ensure all tests pass

## Getting Help

- Check [DEVELOPMENT.md](DEVELOPMENT.md) for development setup
- Look at existing code for patterns and examples
- Open an issue for questions or clarifications
- Join discussions in existing issues and PRs

Thank you for contributing to Simple TTS!