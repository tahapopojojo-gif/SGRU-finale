import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import Register from '../pages/Register'

vi.mock('../services/api', () => ({
  default: {
    register: vi.fn().mockResolvedValue({}),
  },
}))

function renderRegister() {
  return render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  )
}

describe('Register Wizard — Role-based field visibility', () => {
  it('shows step 1 (role selection) on initial render', () => {
    renderRegister()
    expect(screen.getByText('Qui êtes-vous ?')).toBeInTheDocument()
    expect(screen.getByText('Citoyen')).toBeInTheDocument()
    expect(screen.getByText('Urbaniste')).toBeInTheDocument()
    expect(screen.getByText('Administrateur')).toBeInTheDocument()
  })

  it('selecting Citoyen advances to step 2, then to step 3 with quartier selector', () => {
    renderRegister()

    fireEvent.click(screen.getByText('Citoyen'))
    expect(screen.getByText('Votre ville de résidence')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Rechercher une ville...')
    fireEvent.change(searchInput, { target: { value: 'Marrakech' } })

    fireEvent.click(screen.getByText('Marrakech'))
    fireEvent.click(screen.getByText(/Continuer avec Marrakech/))

    expect(screen.getByText('Votre quartier')).toBeInTheDocument()
  })

  it('selecting Admin advances to step 3 with department autocomplete', () => {
    renderRegister()

    fireEvent.click(screen.getByText('Administrateur'))
    expect(screen.getByText("Ville d'affectation")).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Rechercher une ville...')
    fireEvent.change(searchInput, { target: { value: 'Rabat' } })

    fireEvent.click(screen.getByText('Rabat'))
    fireEvent.click(screen.getByText(/Continuer avec Rabat/))

    expect(screen.getByText('Service / Département')).toBeInTheDocument()
  })

  it('selecting Urbaniste advances to step 3 with department autocomplete', () => {
    renderRegister()

    fireEvent.click(screen.getByText('Urbaniste'))
    expect(screen.getByText("Ville d'affectation")).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Rechercher une ville...')
    fireEvent.change(searchInput, { target: { value: 'Fès' } })

    fireEvent.click(screen.getByText('Fès'))
    fireEvent.click(screen.getByText(/Continuer avec Fès/))

    expect(screen.getByText('Service / Département')).toBeInTheDocument()
  })

  it('returns to previous step when back button is clicked', () => {
    renderRegister()

    fireEvent.click(screen.getByText('Citoyen'))
    expect(screen.getByText('Votre ville de résidence')).toBeInTheDocument()

    fireEvent.click(screen.getByText('← Retour'))
    expect(screen.getByText('Qui êtes-vous ?')).toBeInTheDocument()
  })
})
