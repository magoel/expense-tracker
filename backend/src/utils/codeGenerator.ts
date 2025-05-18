/**
 * Generates a random base36 code of the specified length
 * Used for creating unique group access codes
 * 
 * @param length The length of the code to generate
 * @returns A random base36 string
 */
export const generateRandomBase36Code = (length: number): string => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
};
