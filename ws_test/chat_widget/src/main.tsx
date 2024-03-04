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
import Stream from './routes/stream.tsx';
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
  },
  {
    path: '/stream',
    element: <Stream/>
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <nav>
      <h1 className='main-name'>stream</h1>
    </nav>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </>
)
