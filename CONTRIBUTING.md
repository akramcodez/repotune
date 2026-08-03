# Contributing to repotune
=====================================

Thank you for considering contributing to repotune, a repository quality toolkit designed to scan, fix, and maintain high-quality open source repositories. This document outlines the guidelines and procedures for contributing to repotune.

## Development Setup
---------------------

To start developing repotune, follow these steps:

1. Clone the repository: `git clone https://github.com/akramcodez/repotune.git`
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Start the development server: `npm run dev`
5. Verify the project is working as expected by running `npm run test`

To ensure code quality and consistency, please use the following scripts from the project manifest:

* `npm run typecheck` to check for type errors
* `npm run lint` to check for code style issues
* `npm run format` to format the code according to the project's coding standards
* `npm run format:check` to check if the code is formatted correctly

## Testing Guidelines
---------------------

Testing is crucial to ensuring repotune works as expected. Please follow these guidelines when writing tests:

* Write tests for new features or bug fixes
* Use the `vitest` framework for writing unit tests
* Use the `vitest.config.ts` file to configure test settings
* Run `npm run test` to execute all tests
* Run `npm run test:watch` to run tests in watch mode
* Run `npm run test:all` to run all tests, including type checking and linting

## Pull Request Instructions
---------------------------

To submit a pull request to repotune, follow these steps:

1. Create a new branch: `git checkout -b <branch-name>`
2. Make changes and commit them: `git add .` and `git commit -m "<commit-message>"`
3. Push the changes to the remote repository: `git push origin <branch-name>`
4. Create a pull request on GitHub, targeting the `main` branch
5. Ensure the pull request includes:
	* A clear and concise title describing the changes
	* A detailed description of the changes, including any relevant context or explanations
	* A link to any related issues or pull requests
6. Wait for the pull request to be reviewed and approved by the maintainers
7. Address any review comments or issues, and push the updated changes to the remote repository

## Code of Conduct
------------------

repotune adheres to a strict code of conduct, which can be found in the `CODE_OF_CONDUCT.md` file. By contributing to repotune, you agree to abide by this code of conduct.

## Licensing
------------

repotune is licensed under the terms of the `LICENSE` file. By contributing to repotune, you agree to release your contributions under the same license.

## Acknowledgments
-----------------

repotune is maintained by SK Akram <skcodewizard786@gmail.com>. Thank you to all contributors who have helped shape repotune into the repository quality toolkit it is today.