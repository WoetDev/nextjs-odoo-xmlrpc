# Odoo Model Explorer using Next.js

A Next.js web application that provides an example on how to explore Odoo models, fields, and data. This tool helps developers using Next.js to understand how to build an Odoo integration.

## Features

- **Model Overview**: Lists all accessible models in your Odoo instance with their technical names and descriptions
- **Field Inspection**: For each model, displays detailed field information including:
  - Field name and label
  - Field type
  - Required/Readonly status
  - Help text
  - Relations to other models
- **Chart of Accounts**: As an example on how to fetch data, a dedicated page to explore the accounting structure:
  - Account codes and names
  - Account types
  - Company association
  - Reconciliation status

## Getting Started

1. Set up your environment variables in `.env.local`:
```bash
ODOO_HOST=your-odoo-url
ODOO_DB=your-database-name
ODOO_USER=your-username
ODOO_PASSWORD=your-password
```

2. Install dependencies:
```bash
pnpm install
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to explore your Odoo instance.

## Technical Details

- Built with Next.js 15 and React
- Uses Tailwind CSS for styling
- Integrates with Odoo using the odoo-await library
- Server-side rendering for optimal performance
- TypeScript for type safety

## Security Note

This application requires Odoo credentials to function. Make sure to:
- Use appropriate credentials with limited access rights
- Never commit sensitive information to version control
- Consider using API keys instead of user passwords
- Deploy in a secure environment

