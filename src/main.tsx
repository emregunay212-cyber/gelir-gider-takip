import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthGate } from './features/auth/AuthGate';
import { CurrentUserProvider } from './features/identity/CurrentUserProvider';
import { SalaryProvider } from './features/income/SalaryProvider';
import { CashProvider } from './features/cash/CashProvider';
import { ExpenseProvider } from './features/expense/ExpenseProvider';
import { BillsProvider } from './features/bills/BillsProvider';
import { DebtPaymentProvider } from './features/debt/DebtPaymentProvider';
import { IncomeOverridesProvider } from './features/income-overrides/IncomeOverridesProvider';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element bulunamadı.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
        <CurrentUserProvider>
          <SalaryProvider>
            <CashProvider>
              <ExpenseProvider>
                <BillsProvider>
                  <DebtPaymentProvider>
                    <IncomeOverridesProvider>
                      <App />
                    </IncomeOverridesProvider>
                  </DebtPaymentProvider>
                </BillsProvider>
              </ExpenseProvider>
            </CashProvider>
          </SalaryProvider>
        </CurrentUserProvider>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);
