/** English UI strings. */
export const en = {
  common: {
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    submit: 'Submit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    yes: 'Yes',
    no: 'No',
  },
  nav: {
    home: 'Home',
    shop: 'Shop',
    categories: 'Categories',
    about: 'About',
    cart: 'Cart',
    account: 'Account',
    login: 'Sign in',
    register: 'Create account',
    logout: 'Sign out',
    orders: 'My orders',
    wishlist: 'Wishlist',
    dashboard: 'Dashboard',
  },
  auth: {
    loginTitle: 'Sign in to Anzara',
    loginSubtitle: 'Welcome back. Please enter your details.',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    noAccount: "Don't have an account?",
    createAccount: 'Create one',
    registerTitle: 'Create your account',
    registerSubtitle: 'Join Anzara for a faster checkout and order tracking.',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone (optional)',
    confirmPassword: 'Confirm password',
    haveAccount: 'Already have an account?',
    signIn: 'Sign in',
    signUp: 'Create account',
    invalidCredentials: 'Invalid email or password',
    emailTaken: 'This email is already registered',
    passwordTooShort: 'Password must be at least 8 characters',
    forgotTitle: 'Reset your password',
    forgotSubtitle: "Enter your email and we'll send you a reset link.",
    sendResetLink: 'Send reset link',
    resetSent: 'If that email exists, a reset link has been sent.',
    newPassword: 'New password',
    resetTitle: 'Set a new password',
    resetButton: 'Update password',
  },
  account: {
    title: 'My account',
    profile: 'Profile',
    addresses: 'Addresses',
    settings: 'Settings',
    welcome: 'Welcome, {name}',
  },
  footer: {
    copyright: '© 2026 Anzara. All rights reserved.',
  },
} as const;

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>;
};

/**
 * The dictionary shape — every value is a `string`, so other locales
 * (which use non-ASCII characters) can be type-checked against it.
 */
export type Dictionary = DeepStringify<typeof en>;
