# Design Lab

A single Codex workflow for turning a product brief into responsive, interactive design alternatives. Give `$design-lab` a specification, compare directions in a gallery, and refine the one you choose. Design guidance, components, motion, and verification live behind one skill and one project agent.

## Quick start

Requires Codex, your own model access, Node.js 24.22.1 or later in the Node 24 series, and npm.

```sh
git clone https://github.com/volodymyrshyshelov/design-lab.git
cd design-lab
npm ci --ignore-scripts
node scripts/design-lab.mjs create ../my-prototype --name "My prototype"
cd ../my-prototype
npm ci --ignore-scripts
```

Open `my-prototype` in Codex and start a new session:

```text
$design-lab Use the attached specification to create three distinct
directions for a customer portal and its admin interface.
Cover mobile and desktop, connect the main actions, and identify
decisions the specification leaves open.
```

The starter is a working foundation. Your brief determines the actual screens, roles, and behavior. Generated prototypes use synthetic data and local persistence; production integrations require separate implementation.

- [Install, update, and verify](docs/installation.md)
- [Create, refine, and share a prototype](docs/working-with-design-lab.md)
- [Third-party sources and licenses](docs/third-party.md)

The project installer is the primary setup route. Optional plugin manifests are included; native Codex plugin discovery has not been verified, and installing the plugin alone does not prepare the project agent or runtime. Native Windows execution also remains unverified.

Creating designs requires a model in your Codex session. Packaged prototypes can be viewed in a browser without Codex. Image generation is optional and depends on capabilities available in the host session.

Maintained by [volodymyrshyshelov](https://github.com/volodymyrshyshelov). First-party materials remain all rights reserved; public repository visibility is not a permissive license. See [LICENSE](LICENSE). Third-party materials retain their own licenses.
