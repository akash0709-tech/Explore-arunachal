// The React context objects. Kept in their own file so the provider files only
// export components (this keeps React Fast Refresh working during development).
import { createContext } from "react";

export const AuthContext = createContext(null);
export const ToastContext = createContext(null);
