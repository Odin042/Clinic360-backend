# clinic360-backend

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string.
- `DB_SSL`: set to `false` to disable SSL (default uses SSL).
- `DB_REJECT_UNAUTHORIZED`: when using SSL, set to `false` to allow self-signed certificates.

This project was created using `bun init` in bun v1.1.6. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
