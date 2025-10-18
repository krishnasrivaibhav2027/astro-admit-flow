# Welcome to Your Frontend Project

This project is built with a modern, robust stack designed for building high-quality web applications.

## Getting Started

To get this project up and running on your local machine, follow these simple steps.

### Prerequisites

- **Node.js**: Make sure you have Node.js installed. We recommend using a version manager like [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage your Node.js versions.
- **npm** or **yarn**: This project uses a package manager to handle dependencies. You can use either npm (which comes with Node.js) or [Yarn](https://yarnpkg.com/).

### Installation

1.  **Clone the Repository**

    First, clone this repository to your local machine using your preferred method (HTTPS or SSH).

    ```sh
    git clone <YOUR_GIT_URL>
    ```

2.  **Navigate to the Project Directory**

    ```sh
    cd <YOUR_PROJECT_NAME>
    ```

3.  **Install Dependencies**

    Install all the necessary dependencies using npm or yarn.

    ```sh
    npm install
    # or
    yarn install
    ```

4.  **Set Up Environment Variables**

    This project requires certain environment variables to be set up to connect to backend services like Supabase and Firebase.

    -   Create a `.env` file in the `frontend` directory.
    -   Copy the contents of `.env.example` (if it exists) into your new `.env` file.
    -   Fill in the required values for your Supabase and Firebase projects.

5.  **Run the Development Server**

    Once the dependencies are installed and the environment variables are set, you can start the development server.

    ```sh
    npm run dev
    # or
    yarn dev
    ```

    This will start the development server, and you can view your application in your browser, usually at `http://localhost:5173`.

## Technologies Used

This project is built with a powerful set of technologies:

-   **Vite**: A next-generation frontend build tool that provides a faster and leaner development experience.
-   **TypeScript**: A statically typed superset of JavaScript that adds type safety to your code.
-   **React**: A popular JavaScript library for building user interfaces.
-   **shadcn-ui**: A beautifully designed and accessible component library.
-   **Tailwind CSS**: A utility-first CSS framework for rapid UI development.

## Deployment

To deploy this project, you can use any modern hosting provider that supports Node.js applications, such as Vercel, Netlify, or Firebase Hosting.

The typical deployment process involves:

1.  **Building the Project**

    Create a production-ready build of your application.

    ```sh
    npm run build
    # or
    yarn build
    ```

    This will create a `dist` directory with the optimized assets for your application.

2.  **Deploying the `dist` Directory**

    Deploy the contents of the `dist` directory to your hosting provider of choice.
