import { BrowserRouter, Routes, Route } from 'react-router-dom'
import InputZonePage from './pages/InputZonePage'
import SessionPage from './pages/SessionPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InputZonePage />} />
        <Route path="/session/:sessionId" element={<SessionPage />} />
      </Routes>
    </BrowserRouter>
  )
}
