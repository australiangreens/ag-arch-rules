# Publishing

## Steps

1. Stage and commit your changes via `git add ...`, `git commit ...`, etc., on the `main` branch

2. Run `pnpm release patch|minor|major` (pick whichever option is most appropriate)

3. Run `pnpm ship`. This will run tests, do a production build and then publish it
   to npmjs.com. You'll be asked to authenticate
