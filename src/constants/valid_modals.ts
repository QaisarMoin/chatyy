/**
 * List of valid models that can be used in the application.
 */
export const VALID_MODELS = [
  {
    model: 'gpt-3.5-turbo',
    name: 'openai_3.5_turbo',
    display: 'GPT-3.5 Turbo',
  },
  {
    model: 'gpt-4o',
    name: 'openai_4o',
    display: 'GPT-4 Optimized',
  },
  {
    model: 'gemini-2.0-flash',
    name: 'gemini_2.0_flash',
    display: 'Gemini 2.0 Flash',
  },
]

/**
 * Type of valid models that can be used in the application.
 */
export type ValidModel = 'openai_3.5_turbo' | 'openai_4o' | 'gemini-2.0-flash'
