import type en from '../../dictionaries/en.json';

/** Shape of every dictionary. en.json is the reference; th.json must match it. */
export type Dictionary = typeof en;

export type ServiceText = { name: string; description: string; alt: string };
export type BarberText = { name: string; role: string; specialty: string; alt: string };
