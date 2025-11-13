import { functions, httpsCallable } from "./firebase.js";
import { showAlert } from "./ui/alert.js";

/**
 * A centralized wrapper for calling Firebase Cloud Functions.
 * Handles authentication checks and generic error logging.
 *
 * @param {string} functionName - The name of the Cloud Function to call.
 * @param {object} [data={}] - The data to send to the function.
 * @returns {Promise<any>} A promise that resolves with the result data from the function.
 * @throws {Error} Throws an error if the function call fails, allowing for specific error handling.
 */
export async function callFunction(functionName, data = {}) {
  try {
    const callable = httpsCallable(functions, functionName);
    const result = await callable(data);
    
    // Some functions might return success: false in their data payload
    if (result.data && result.data.success === false) {
        throw new Error(result.data.error || `Function ${functionName} reported a failure.`);
    }

    return result.data;
  } catch (error) {
    console.error(`Error calling function '${functionName}':`, error);
    
    // Provide more user-friendly error messages for common cases
    const errorMessage =
      error.code === "unauthenticated"
        ? "Você precisa estar logado para realizar esta ação."
        : "Ocorreu um erro ao comunicar com o servidor. Tente novamente.";
        
    showAlert(errorMessage);

    throw error; // Re-throw to be handled by the specific calling code if needed
  }
}