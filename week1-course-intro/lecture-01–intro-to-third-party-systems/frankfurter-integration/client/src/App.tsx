import { useEffect, useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [rates, setRates] = useState(0)


  useEffect(() => {
    fetch('/api/currency/rates')
    .then(response => response.json())
    .then((data) => {
      console.log(data)
      setRates(data.rates)
    })
  }, [])

  return (
    <>
        
    </>
  )
}

export default App
