import ReactDOM from 'react-dom/client'
import { 
  createBrowserRouter,
  RouterProvider 
} from 'react-router-dom';

import './index.css'

/* theme provider */
import { ThemeProvider } from '@/components/ThemeProvider.tsx';

/* routes */
import Root from "./routes/root.tsx";
import Chat from './routes/chat.tsx'
import ErrorPage from './routes/error-page.tsx';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root/>,
    errorElement: <ErrorPage/> 
  },
  {
    path: '/chat',
    element: <Chat/>
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </>
)
