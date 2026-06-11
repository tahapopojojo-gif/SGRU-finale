import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import FeedbackForm from '../components/FeedbackForm'

vi.mock('../services/aiService', () => ({
  analyzeOpinion: vi.fn().mockResolvedValue({
    relevant: true,
    cleaned_text: 'Test description pour un problème autre.',
  }),
}))

const mockParcel = {
  positions: [[31.6295, -7.9811]],
  isNew: true,
}

function renderForm() {
  let fetchResolver
  global.fetch = vi.fn().mockReturnValue(new Promise(resolve => {
    fetchResolver = resolve
  }))
  const utils = render(
    <FeedbackForm
      parcel={mockParcel}
      onSubmit={vi.fn()}
      onClose={vi.fn()}
    />
  )
  act(() => {
    fetchResolver({
      json: () => ({ display_name: 'Test Address, Marrakech, Morocco' }),
    })
  })
  return utils
}

describe('FeedbackForm — "Autre" category guardrail', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ display_name: 'Test Address, Marrakech, Morocco' }),
    })
  })

  it('renders step 1 with problem type options', () => {
    renderForm()
    expect(screen.getByText('Quel type de problème est-ce ?')).toBeInTheDocument()
    expect(screen.getByText('Autre')).toBeInTheDocument()
    expect(screen.getByText('Route ou trottoir')).toBeInTheDocument()
  })

  it('shows description as optional for non-Autre category', () => {
    renderForm()

    fireEvent.click(screen.getByText('Route ou trottoir'))
    const btn3 = screen.getByRole('radio', { name: "Niveau d'urgence 3" })
    fireEvent.click(btn3)
    const durationBtn = screen.getByText("Vient d'apparaître (quelques jours)")
    fireEvent.click(durationBtn)

    fireEvent.click(screen.getByText('Suivant →'))

    const optionnels = screen.getAllByText('(optionnel)')
    expect(optionnels.length).toBeGreaterThanOrEqual(1)
  })

  it('shows description as mandatory when Autre is selected', () => {
    renderForm()

    fireEvent.click(screen.getByText('Autre'))
    const btn3 = screen.getByRole('radio', { name: "Niveau d'urgence 3" })
    fireEvent.click(btn3)
    const durationBtn = screen.getByText("Vient d'apparaître (quelques jours)")
    fireEvent.click(durationBtn)

    fireEvent.click(screen.getByText('Suivant →'))

    expect(screen.getByText('(obligatoire)')).toBeInTheDocument()
  })

  it('shows mandatory placeholder when Autre is selected', () => {
    renderForm()

    fireEvent.click(screen.getByText('Autre'))
    const btn3 = screen.getByRole('radio', { name: "Niveau d'urgence 3" })
    fireEvent.click(btn3)
    const durationBtn = screen.getByText("Vient d'apparaître (quelques jours)")
    fireEvent.click(durationBtn)

    fireEvent.click(screen.getByText('Suivant →'))

    const textarea = screen.getByPlaceholderText(/Décrivez précisément/)
    expect(textarea).toBeInTheDocument()
  })

  it('disables submit button when Autre is selected but description is empty', () => {
    renderForm()

    fireEvent.click(screen.getByText('Autre'))
    const btn3 = screen.getByRole('radio', { name: "Niveau d'urgence 3" })
    fireEvent.click(btn3)
    const durationBtn = screen.getByText("Vient d'apparaître (quelques jours)")
    fireEvent.click(durationBtn)

    fireEvent.click(screen.getByText('Suivant →'))

    const submitBtn = screen.getByRole('button', { name: 'Envoyer mon avis' })
    expect(submitBtn).toBeDisabled()
  })

  it('enables submit button when Autre is selected and description is filled', async () => {
    renderForm()

    fireEvent.click(screen.getByText('Autre'))
    const btn3 = screen.getByRole('radio', { name: "Niveau d'urgence 3" })
    fireEvent.click(btn3)
    const durationBtn = screen.getByText("Vient d'apparaître (quelques jours)")
    fireEvent.click(durationBtn)

    fireEvent.click(screen.getByText('Suivant →'))

    const textarea = screen.getByPlaceholderText(/Décrivez précisément/)
    fireEvent.change(textarea, { target: { value: 'Un problème sérieux dans mon quartier qui nécessite une intervention rapide des autorités.' } })

    await waitFor(() => {
      const submitBtn = screen.getByRole('button', { name: 'Envoyer mon avis' })
      expect(submitBtn).not.toBeDisabled()
    })
  })
})
