# LKE Plugin: Third Party Data

## Purpose and principles
The plugin is used to import Third Party Data to enrich certain nodes in your graph:
- For example, you may have a `Person` node in your graph, and you want to enrich it with data from the [Clearbit API](https://clearbit.com/docs#enrichment-api).
- You click any `Person` node in the graph, use the `custom action` menu and click `Enrich with Clearbit`.
- The plugin opens abd shows a list of matching results from the Clearbit API.
- You select the result you want to import, which creates a new `Person_Details` node in the graph with the data from the API, linked to the original `Person` node.

The plugin supports multiple vendor APIs.
To use one API, you must first create an **API integration** (can only be done by an admin).
Then, you can use the plugin to search for matching data for a given node, and create a new node in the graph with the data from the API.

An **API integration** is a configuration that contains:
- the API to use (e.g. `dun-bradstreet-people`)
- the data-source to use (e.g. `My transaction graph`)
- the type of node to use as input for searching (e.g. `Person`)
- the properties of the input node to use as search parameters (e.g. `name`, `email`, `phone`)
- the type of node to create as output with the response data (e.g. `Person_Details`)
- the properties of the response to use as properties of the new node (e.g. `email`, `phone`, `company`, `job_title`, `location`, `industry`, `linkedin`, `twitter`)

## Using the plugin
Installing & accessing:
- Check the documentation on [how to install plugins](https://doc.linkurious.com/admin-manual/latest/plugins/#how-do-i-install-plugins-).
- Once the plugin is installed, open the plugin page (default path: `/plugins/3d/`).

Features:
- Admin: create/list/edit/delete API integrations
- User: search for matching data for a given input node using an existing API integration
- User: choose a result from the list of matching data to create a new node in the graph

## Contributing
This project is using npm workspaces.
The code is distributed into 3 main locations:
- shared code (simple folder under `packages/shared`)
- frontend (npm workspace under `packages/frontend`
- backend (npm workspace under `packages/backend`)

### Getting started
To install all dependencies, run:
```bash
npm install
```

To run the project locally in development mode (with mock data), run:
```bash
npm start # starts the frontend with a mock backend at http://localhost:4000/plugins/3d/
```
You can edit the development config at:
- `packages/frontend/vite.config.ts`
- `packages/frontend/src/dev/apiMocks.ts`

To build the plugin for production, run:
```bash
npm run build
```

### Frontend
The frontend is a Vanilla single-page JavaScript application, written in TypeScript and compiled/bundled with Vite.

### Backend
The backend is a Node.js application based on the express Web server, written in TypeScript and compiled with tsc.
