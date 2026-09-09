import Modal from './Modal.jsx';
import Button from './Button.jsx';

export default function ConfirmDialog({ open, title, message, onConfirm, onCancel, loading }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? 'Excluindo...' : 'Excluir'}
        </Button>
      </div>
    </Modal>
  );
}
