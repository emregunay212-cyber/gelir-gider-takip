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
import { SettingsProvider } from './features/settings/SettingsProvider';
import { AccountOverridesProvider } from './features/accounts/AccountOverridesProvider';
import { CustomIncomesProvider } from './features/custom-data/CustomIncomesProvider';
import { CustomAccountsProvider } from './features/custom-data/CustomAccountsProvider';
import { CustomDebtsProvider } from './features/custom-data/CustomDebtsProvider';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element bulunamadı.');
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
        <SettingsProvider>
          <CurrentUserProvider>
            <SalaryProvider>
              <CashProvider>
                <ExpenseProvider>
                  <BillsProvider>
                    <DebtPaymentProvider>
                      <IncomeOverridesProvider>
                        <AccountOverridesProvider>
                          <CustomIncomesProvider>
                            <CustomAccountsProvider>
                              <CustomDebtsProvider>
                                <App />
                              </CustomDebtsProvider>
                            </CustomAccountsProvider>
                          </CustomIncomesProvider>
                        </AccountOverridesProvider>
                      </IncomeOverridesProvider>
                    </DebtPaymentProvider>
                  </BillsProvider>
                </ExpenseProvider>
              </CashProvider>
            </SalaryProvider>
          </CurrentUserProvider>
        </SettingsProvider>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);
