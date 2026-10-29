// Friendly "nothing here yet" block with an optional action.
//   <EmptyState icon="compass" title="No saved trips yet" action={<ButtonLink to="/plan">Plan a trip</ButtonLink>}>
//     Trips you save open even without network.
//   </EmptyState>
import { Icon } from "./Icon.jsx";

export function EmptyState({ icon = "compass", title, children, action }) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={28} />
      </span>
      <h3>{title}</h3>
      {children && <p className="empty__text">{children}</p>}
      {action}
    </div>
  );
}
