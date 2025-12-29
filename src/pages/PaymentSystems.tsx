import { useState, useEffect } from 'react';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { shm_request } from '../lib/shm_request';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { UniversalPaymentModal, PaymentSystem } from '../modals/PaymentSystems/UniversalPaymentModal';

function PaymentSystems() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [paymentSystems, setPaymentSystems] = useState<PaymentSystem[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<PaymentSystem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  useEffect(() => {
    loadPaymentSystems();
  }, []);

  const loadPaymentSystems = async () => {
    setLoading(true);
    try {
      const response = await shm_request('shm/v1/admin/cloud/proxy/service/paysystems/list');
      const systems = Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []);
      setPaymentSystems(systems);
    } catch (error) {
      toast.error('Ошибка загрузки платежных систем');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemClick = (system: PaymentSystem) => {
    setSelectedSystem(system);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedSystem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
               style={{ borderColor: 'var(--accent-primary)' }}></div>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className="text-2xl font-bold flex items-center gap-3"
          style={{ color: 'var(--theme-content-text)' }}
        >
          <CreditCard className="w-7 h-7" style={{ color: 'var(--theme-primary-color)' }} />
          Платежные системы
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded flex items-center gap-2"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Назад
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {paymentSystems.map((system) => (
          <div
            key={system.name}
            className="rounded-lg border p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-105"
            style={cardStyles}
            onClick={() => handleSystemClick(system)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-input-bg)' }}>
                <CreditCard className="w-6 h-6" style={{ color: 'var(--accent-primary)' }} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-content-text)' }}>
                {system.title}
              </h3>
            </div>
            <p className="text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
              {system.description}
            </p>
            {system.paid ? (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-success)' }}>
                  Куплена
                </p>
              </div>
            ) : system.price && system.price > 0 ? (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  Стоимость: {system.price} ₽
                </p>
              </div>
            ) : undefined }
          </div>
        ))}
      </div>

      {paymentSystems.length === 0 && (
        <div className="rounded-lg border p-6 text-center" style={cardStyles}>
          <p style={{ color: 'var(--theme-content-text-muted)' }}>
            Нет доступных платежных систем
          </p>
        </div>
      )}

      {selectedSystem && (
        <UniversalPaymentModal
          open={modalOpen}
          onClose={handleCloseModal}
          system={selectedSystem}
        />
      )}
    </div>
  );
}

export default PaymentSystems;
