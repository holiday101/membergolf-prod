import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function SubEventCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const eventParam = searchParams.get("event");
  const eventId = eventParam ? Number(eventParam) : null;

  useEffect(() => {
    if (!eventId || !Number.isFinite(eventId)) {
      navigate("/events", { replace: true });
      return;
    }
    navigate(`/events/${eventId}`, { replace: true });
  }, [eventId, navigate]);

  return null;
}
