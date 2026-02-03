import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../auth";

type EventRow = {
  id: number;
  eventname: string;
  start_dt: string;
  end_dt: string;
  nine_id?: number | null;
  numholes?: number | null;
  startinghole?: number | null;
};

type NineRow = {
  nine_id: number;
  ninename: string;
  numholes?: number | null;
  startinghole?: number | null;
  hole1?: number | null;
  hole2?: number | null;
  hole3?: number | null;
  hole4?: number | null;
  hole5?: number | null;
  hole6?: number | null;
  hole7?: number | null;
  hole8?: number | null;
  hole9?: number | null;
  hole10?: number | null;
  hole11?: number | null;
  hole12?: number | null;
  hole13?: number | null;
  hole14?: number | null;
  hole15?: number | null;
  hole16?: number | null;
  hole17?: number | null;
  hole18?: number | null;
};

type CardRow = {
  card_id: number;
  member_id: number | null;
  nine_id?: number | null;
  firstname: string | null;
  lastname: string | null;
  gross: number | null;
  net: number | null;
  card_dt: string | null;
  hole1?: number | null;
  hole2?: number | null;
  hole3?: number | null;
  hole4?: number | null;
  hole5?: number | null;
  hole6?: number | null;
  hole7?: number | null;
  hole8?: number | null;
  hole9?: number | null;
  hole10?: number | null;
  hole11?: number | null;
  hole12?: number | null;
  hole13?: number | null;
  hole14?: number | null;
  hole15?: number | null;
  hole16?: number | null;
  hole17?: number | null;
  hole18?: number | null;
};

type CardForm = {
  member_id: string;
  nine_id: string;
  gross: string;
  card_dt: string;
  holes: Record<number, string>;
};

type AddCardForm = {
  member_id: string;
  nine_id: string;
  gross: string;
  card_dt: string;
  holes: Record<number, string>;
};

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getHoleLabels(event: EventRow | null): number[] {
  const numholes = event?.numholes ?? 18;
  const startinghole = event?.startinghole ?? 1;
  if (numholes === 9) {
    return startinghole === 10
      ? [10, 11, 12, 13, 14, 15, 16, 17, 18]
      : [1, 2, 3, 4, 5, 6, 7, 8, 9];
  }
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
}

function getHoleDefault(nine: NineRow | null, hole: number): number | null {
  if (!nine) return null;
  return (nine as any)[`hole${hole}`] ?? null;
}

function splitFrontBack(holes: number[]): { front: number[]; back: number[] } {
  return { front: holes.slice(0, 9), back: holes.slice(9, 18) };
}

function computeGross(holes: Record<number, string>): number {
  return Object.values(holes).reduce((sum, v) => sum + (Number(v) || 0), 0);
}

function defaultCardDate(cards: CardRow[]): string {
  const withDate = cards
    .filter((c) => c.card_dt)
    .sort((a, b) => new Date(b.card_dt as string).getTime() - new Date(a.card_dt as string).getTime());
  if (withDate.length) return toInputDate(withDate[0].card_dt);
  return toInputDate(new Date().toISOString());
}

export default function EnterScoresPage() {
  const { id } = useParams();
  const [event, setEvent] = useState<EventRow | null>(null);
  const [cards, setCards] = useState<CardRow[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cardForm, setCardForm] = useState<CardForm>({
    member_id: "",
    nine_id: "",
    gross: "",
    card_dt: "",
    holes: {},
  });
  const [addCardForm, setAddCardForm] = useState<AddCardForm>({
    member_id: "",
    nine_id: "",
    gross: "",
    card_dt: "",
    holes: {},
  });
  const [members, setMembers] = useState<Array<{ member_id: number; firstname: string; lastname: string }>>([]);
  const [nines, setNines] = useState<NineRow[]>([]);
  const [cardSort, setCardSort] = useState<"recent" | "name">("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const addMemberRef = useRef<HTMLInputElement | null>(null);
  const editMemberRef = useRef<HTMLInputElement | null>(null);

  const selectedCard = useMemo(
    () => cards.find((c) => c.card_id === selectedCardId) ?? null,
    [cards, selectedCardId]
  );
  const addNine = useMemo(() => {
    const idVal = addCardForm.nine_id || (event?.nine_id ? String(event.nine_id) : "");
    return nines.find((n) => String(n.nine_id) === idVal) ?? null;
  }, [addCardForm.nine_id, event, nines]);
  const editNine = useMemo(() => {
    const idVal = cardForm.nine_id || (event?.nine_id ? String(event.nine_id) : "");
    return nines.find((n) => String(n.nine_id) === idVal) ?? null;
  }, [cardForm.nine_id, event, nines]);

  const displayCards = useMemo(() => {
    if (cardSort === "name") {
      return [...cards].sort((a, b) => {
        const la = (a.lastname ?? "").toLowerCase();
        const lb = (b.lastname ?? "").toLowerCase();
        if (la !== lb) return la.localeCompare(lb);
        const fa = (a.firstname ?? "").toLowerCase();
        const fb = (b.firstname ?? "").toLowerCase();
        if (fa !== fb) return fa.localeCompare(fb);
        const da = a.card_dt ? new Date(a.card_dt).getTime() : 0;
        const db = b.card_dt ? new Date(b.card_dt).getTime() : 0;
        return da - db;
      });
    }
    return [...cards].sort((a, b) => b.card_id - a.card_id);
  }, [cards, cardSort]);

  const normalizeName = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  const findBestMemberLabel = (input: string) => {
    const trimmed = normalizeName(input);
    if (!trimmed) return "";
    const direct = members.find(
      (m) => normalizeName(`${m.lastname}, ${m.firstname}`) === trimmed
    );
    if (direct) return `${direct.lastname}, ${direct.firstname}`;
    const tokens = trimmed.split(" ").filter(Boolean);
    const tokenMatch = members.find((m) => {
      const name = normalizeName(`${m.lastname}, ${m.firstname}`);
      return tokens.every((t) => name.includes(t));
    });
    if (tokenMatch) return `${tokenMatch.lastname}, ${tokenMatch.firstname}`;
    const prefix = members.find((m) =>
      normalizeName(`${m.lastname}, ${m.firstname}`).startsWith(trimmed)
    );
    if (prefix) return `${prefix.lastname}, ${prefix.firstname}`;
    const contains = members.find((m) =>
      normalizeName(`${m.lastname}, ${m.firstname}`).includes(trimmed)
    );
    if (contains) return `${contains.lastname}, ${contains.firstname}`;
    return "";
  };

  useEffect(() => {
    const run = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const [eventRes, cardsRes, membersRes, ninesRes] = await Promise.all([
          apiFetch(`/api/events/${id}`),
          apiFetch(`/api/events/${id}/cards`),
          apiFetch("/members"),
          apiFetch("/nines"),
        ]);
        if (!eventRes.ok) throw new Error(await eventRes.text());
        if (!cardsRes.ok) throw new Error(await cardsRes.text());
        if (!membersRes.ok) throw new Error(await membersRes.text());
        if (!ninesRes.ok) throw new Error(await ninesRes.text());

        const [eventJson, cardsJson, membersJson, ninesJson] = await Promise.all([
          eventRes.json(),
          cardsRes.json(),
          membersRes.json(),
          ninesRes.json(),
        ]);

        setEvent(eventJson);
        setCards(cardsJson);
        setMembers(membersJson);
        setNines(ninesJson);
        setAddCardForm((prev) => ({
          ...prev,
          card_dt: prev.card_dt || defaultCardDate(cardsJson),
          nine_id: prev.nine_id || (eventJson.nine_id ? String(eventJson.nine_id) : ""),
        }));
      } catch (err: any) {
        setError(String(err?.message || "Failed to load scores"));
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  useEffect(() => {
    if (!selectedCard) return;
    const holes: Record<number, string> = {};
    for (let i = 1; i <= 18; i += 1) {
      const key = `hole${i}` as keyof CardRow;
      const val = (selectedCard as any)[key];
      if (val != null) holes[i] = String(val);
    }
    setCardForm({
      member_id: selectedCard.member_id
        ? `${selectedCard.lastname}, ${selectedCard.firstname}`
        : "",
      nine_id: selectedCard.nine_id
        ? String(selectedCard.nine_id)
        : event?.nine_id
          ? String(event.nine_id)
          : "",
      gross: selectedCard.gross ? String(selectedCard.gross) : "",
      card_dt: selectedCard.card_dt ? toInputDate(selectedCard.card_dt) : defaultCardDate(cards),
      holes,
    });
  }, [selectedCard, cards, event]);

  useEffect(() => {
    if (selectedCardId) {
      editMemberRef.current?.focus();
    } else {
      addMemberRef.current?.focus();
    }
  }, [selectedCardId]);

  async function loadCards() {
    if (!id) return;
    const cardsRes = await apiFetch(`/api/events/${id}/cards`);
    if (!cardsRes.ok) throw new Error(await cardsRes.text());
    const cardsJson = await cardsRes.json();
    setCards(cardsJson);
    setAddCardForm((prev) => ({
      ...prev,
      card_dt: prev.card_dt || defaultCardDate(cardsJson),
      nine_id: prev.nine_id || (event?.nine_id ? String(event.nine_id) : ""),
    }));
  }

  async function saveCard() {
    if (!selectedCardId || !id) return;
    setBusy(true);
    setError("");
    try {
      const selectedMember = members.find(
        (m) => `${m.lastname}, ${m.firstname}` === cardForm.member_id
      );
      if (!selectedMember) throw new Error("Select a member");
      const payload: any = {
        member_id: selectedMember.member_id,
        nine_id: cardForm.nine_id ? Number(cardForm.nine_id) : null,
        gross: computeGross(cardForm.holes),
        card_dt: cardForm.card_dt ? new Date(`${cardForm.card_dt}T00:00:00`).toISOString() : null,
      };
      for (let i = 1; i <= 18; i += 1) {
        if (cardForm.holes[i]) payload[`hole${i}`] = Number(cardForm.holes[i]);
      }
      const res = await apiFetch(`/api/events/${id}/cards/${selectedCardId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadCards();
    } catch (err: any) {
      setError(String(err?.message || "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  async function createCard() {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const selectedMember = members.find(
        (m) => `${m.lastname}, ${m.firstname}` === addCardForm.member_id
      );
      if (!selectedMember) throw new Error("Select a member");
      const payload: any = {
        member_id: selectedMember.member_id,
        nine_id: addCardForm.nine_id ? Number(addCardForm.nine_id) : null,
        gross: computeGross(addCardForm.holes),
        card_dt: addCardForm.card_dt ? new Date(`${addCardForm.card_dt}T00:00:00`).toISOString() : null,
      };
      for (let i = 1; i <= 18; i += 1) {
        if (addCardForm.holes[i]) payload[`hole${i}`] = Number(addCardForm.holes[i]);
      }
      const res = await apiFetch(`/api/events/${id}/cards`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setAddCardForm({
        member_id: "",
        nine_id: event?.nine_id ? String(event.nine_id) : "",
        gross: "",
        card_dt: "",
        holes: {},
      });
      await loadCards();
    } catch (err: any) {
      setError(String(err?.message || "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      {error && (
        <div className="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="eventHeader">
        <button
          className="btn backBtn"
          type="button"
          onClick={() => (id ? window.location.assign(`/events/${id}`) : null)}
        >
          ← Back to Event
        </button>
        <div className="eventTitle">{event?.eventname ?? "Event"}</div>
      </div>

      <div className="grid">
        <section className="card">
          <div className="titleRow" />
          <div className="filterRow">
            <div className="filterTitle">{selectedCard ? "Edit Card" : "Enter Score"}</div>
          </div>
          {selectedCard ? (
            <div className="form">
              <div className="muted">
                {(selectedCard.lastname || "").trim()}, {(selectedCard.firstname || "").trim()}
              </div>
              <div className="formRow">
                <span className="formLabelText">Member</span>
                <input
                  ref={editMemberRef}
                  value={cardForm.member_id}
                  onChange={(e) => setCardForm((p) => ({ ...p, member_id: e.target.value }))}
                  list="member-options"
                  placeholder="Select member"
                  onBlur={(e) => {
                    const best = findBestMemberLabel(e.target.value);
                    if (best) {
                      setCardForm((p) => ({ ...p, member_id: best }));
                    }
                  }}
                />
              </div>
              <div className="formRow">
                <span className="formLabelText">Nine</span>
                <select
                  value={cardForm.nine_id}
                  onChange={(e) => setCardForm((p) => ({ ...p, nine_id: e.target.value }))}
                >
                  <option value="">Select nine</option>
                  {nines.map((n) => (
                    <option key={n.nine_id} value={String(n.nine_id)}>
                      {n.ninename}
                    </option>
                  ))}
                </select>
              </div>
              {event?.numholes === 18 ? (
                <div className="holesLines">
                  <div className="holesHead">Holes</div>
                  <div className="holesNums">
                    {splitFrontBack(getHoleLabels(event)).front.map((hole) => (
                      <div key={hole} className="holeNum">
                        {hole}
                      </div>
                    ))}
                  </div>
                  <div className="holesRow">
                    {splitFrontBack(getHoleLabels(event)).front.map((hole) => (
                      <label key={hole} className="holeInline">
                        <input
                          className="holeInput"
                          value={cardForm.holes[hole] ?? ""}
                          placeholder={
                            getHoleDefault(editNine, hole) != null
                              ? String(getHoleDefault(editNine, hole))
                              : ""
                          }
                          onChange={(e) =>
                            setCardForm((p) => ({
                              ...p,
                              holes: { ...p.holes, [hole]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="holesNums">
                    {splitFrontBack(getHoleLabels(event)).back.map((hole) => (
                      <div key={hole} className="holeNum">
                        {hole}
                      </div>
                    ))}
                  </div>
                  <div className="holesRow">
                    {splitFrontBack(getHoleLabels(event)).back.map((hole) => (
                      <label key={hole} className="holeInline">
                        <input
                          className="holeInput"
                          value={cardForm.holes[hole] ?? ""}
                          placeholder={
                            getHoleDefault(editNine, hole) != null
                              ? String(getHoleDefault(editNine, hole))
                              : ""
                          }
                          onChange={(e) =>
                            setCardForm((p) => ({
                              ...p,
                              holes: { ...p.holes, [hole]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="holesLines">
                  <div className="holesHead">Holes</div>
                  <div className="holesNums">
                    {getHoleLabels(event).map((hole) => (
                      <div key={hole} className="holeNum">
                        {hole}
                      </div>
                    ))}
                  </div>
                  <div className="holesRow">
                    {getHoleLabels(event).map((hole) => (
                      <label key={hole} className="holeInline">
                        <input
                          className="holeInput"
                          value={cardForm.holes[hole] ?? ""}
                          placeholder={
                            getHoleDefault(editNine, hole) != null
                              ? String(getHoleDefault(editNine, hole))
                              : ""
                          }
                          onChange={(e) =>
                            setCardForm((p) => ({
                              ...p,
                              holes: { ...p.holes, [hole]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="row twoCols">
                <label className="formLabel inlineLabel">
                  <span>Date</span>
                  <input
                    type="date"
                    className="dateInput"
                    value={cardForm.card_dt}
                    onChange={(e) => setCardForm((p) => ({ ...p, card_dt: e.target.value }))}
                  />
                </label>
                <label className="formLabel inlineLabel">
                  <span>Gross</span>
                  <input
                    className="grossInput"
                    value={String(computeGross(cardForm.holes))}
                    readOnly
                    aria-readonly="true"
                  />
                </label>
              </div>
              <div className="actions">
                <button className="btn primary" onClick={saveCard} disabled={busy}>
                  {busy ? "Saving…" : "Save card"}
                </button>
              </div>
            </div>
          ) : (
            <div className="form">
              <div className="formRow">
                <span className="formLabelText">Member</span>
                <input
                  ref={addMemberRef}
                  value={addCardForm.member_id}
                  onChange={(e) => setAddCardForm((p) => ({ ...p, member_id: e.target.value }))}
                  list="member-options"
                  placeholder="Select member"
                  onBlur={(e) => {
                    const best = findBestMemberLabel(e.target.value);
                    if (best) {
                      setAddCardForm((p) => ({ ...p, member_id: best }));
                    }
                  }}
                />
              </div>
              <datalist id="member-options">
                {members.map((m) => {
                  const label = `${m.lastname}, ${m.firstname}`;
                  return <option key={m.member_id} value={label} />;
                })}
              </datalist>
              <div className="formRow">
                <span className="formLabelText">Nine</span>
                <select
                  value={addCardForm.nine_id}
                  onChange={(e) => setAddCardForm((p) => ({ ...p, nine_id: e.target.value }))}
                >
                  <option value="">Select nine</option>
                  {nines.map((n) => (
                    <option key={n.nine_id} value={String(n.nine_id)}>
                      {n.ninename}
                    </option>
                  ))}
                </select>
              </div>
              {event?.numholes === 18 ? (
                <div className="holesLines">
                  <div className="holesHead">Holes</div>
                  <div className="holesNums">
                    {splitFrontBack(getHoleLabels(event)).front.map((hole) => (
                      <div key={hole} className="holeNum">
                        {hole}
                      </div>
                    ))}
                  </div>
                  <div className="holesRow">
                    {splitFrontBack(getHoleLabels(event)).front.map((hole) => (
                      <label key={hole} className="holeInline">
                        <input
                          className="holeInput"
                          value={addCardForm.holes[hole] ?? ""}
                          placeholder={
                            getHoleDefault(addNine, hole) != null
                              ? String(getHoleDefault(addNine, hole))
                              : ""
                          }
                          onChange={(e) =>
                            setAddCardForm((p) => ({
                              ...p,
                              holes: { ...p.holes, [hole]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div className="holesNums">
                    {splitFrontBack(getHoleLabels(event)).back.map((hole) => (
                      <div key={hole} className="holeNum">
                        {hole}
                      </div>
                    ))}
                  </div>
                  <div className="holesRow">
                    {splitFrontBack(getHoleLabels(event)).back.map((hole) => (
                      <label key={hole} className="holeInline">
                        <input
                          className="holeInput"
                          value={addCardForm.holes[hole] ?? ""}
                          placeholder={
                            getHoleDefault(addNine, hole) != null
                              ? String(getHoleDefault(addNine, hole))
                              : ""
                          }
                          onChange={(e) =>
                            setAddCardForm((p) => ({
                              ...p,
                              holes: { ...p.holes, [hole]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="holesLines">
                  <div className="holesHead">Holes</div>
                  <div className="holesNums">
                    {getHoleLabels(event).map((hole) => (
                      <div key={hole} className="holeNum">
                        {hole}
                      </div>
                    ))}
                  </div>
                  <div className="holesRow">
                    {getHoleLabels(event).map((hole) => (
                      <label key={hole} className="holeInline">
                        <input
                          className="holeInput"
                          value={addCardForm.holes[hole] ?? ""}
                          placeholder={
                            getHoleDefault(addNine, hole) != null
                              ? String(getHoleDefault(addNine, hole))
                              : ""
                          }
                          onChange={(e) =>
                            setAddCardForm((p) => ({
                              ...p,
                              holes: { ...p.holes, [hole]: e.target.value },
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="row twoCols">
                <label className="formLabel inlineLabel">
                  <span>Date</span>
                  <input
                    type="date"
                    className="dateInput"
                    value={addCardForm.card_dt}
                    onChange={(e) => setAddCardForm((p) => ({ ...p, card_dt: e.target.value }))}
                  />
                </label>
                <label className="formLabel inlineLabel">
                  <span>Gross</span>
                  <input
                    className="grossInput"
                    value={String(computeGross(addCardForm.holes))}
                    readOnly
                    aria-readonly="true"
                  />
                </label>
              </div>
              <div className="actions">
                <button className="btn primary" onClick={createCard} disabled={busy}>
                  {busy ? "Saving…" : "Enter Score"}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="filterRow">
            <div className="filterTitle">Event Cards</div>
            <select
              className="filterSelect"
              value={cardSort}
              onChange={(e) => setCardSort(e.target.value as "recent" | "name")}
            >
              <option value="recent">Most Recent</option>
              <option value="name">Name</option>
            </select>
          </div>
          {loading ? (
            <div className="muted">Loading…</div>
          ) : (
            <div className="table">
              <div className="tableHead">
                <span>Name</span>
                <span>Gross</span>
                <span>Date</span>
                <span></span>
              </div>
              {displayCards.map((c) => (
                <div key={c.card_id} className="tableRow">
                  <span>
                    {(c.lastname || "").trim()}, {(c.firstname || "").trim()}
                  </span>
                  <span>{c.gross ?? "—"}</span>
                  <span>{c.card_dt ? new Date(c.card_dt).toLocaleDateString() : "—"}</span>
                  <button className="btn small" onClick={() => setSelectedCardId(c.card_id)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .page { display: grid; gap: 14px; }
        .grid { display: grid; gap: 14px; grid-template-columns: 1fr 1fr; align-items: start; }
        @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
        .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 14px; }
        .backRow { display: none; }
        .eventHeader { display: flex; align-items: center; gap: 10px; }
        .eventTitle { font-size: 16px; font-weight: 700; color: #111827; }
        .titleRow { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        h2 { margin: 0; font-size: 15px; text-align: left; }
        .muted { color: #6b7280; font-size: 12px; }
        .form { display: grid; gap: 8px; }
        label { display: grid; gap: 4px; font-weight: 600; font-size: 12px; }
        .formLabel { color: #6b7280; }
        .formRow {
          display: grid;
          grid-template-columns: 70px 1fr;
          gap: 8px;
          align-items: center;
        }
        .formLabelText {
          color: #6b7280;
          font-weight: 600;
          font-size: 12px;
          text-align: right;
        }
        input, select { padding: 5px 6px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 11px; }
        .holeInput::placeholder { color: #cbd5e1; }
        .row { display: grid; gap: 8px; }
        .row.twoCols { grid-template-columns: 1fr 1fr; align-items: end; }
        .dateInput { width: 100%; max-width: 160px; color: #111827; }
        .inlineLabel { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .grossInput {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 4px 6px;
          font-size: 11px;
          background: #f8fafc;
          color: #111827;
        }
        .actions { display: flex; gap: 8px; }
        .filterRow { display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; margin: 6px 0; }
        .filterTitle { text-align: center; font-size: 15px; color: #6b7280; font-weight: 600; }
        .filterSelect { padding: 4px 8px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 11px; }
        .table { display: grid; gap: 8px; margin-top: 12px; }
        .tableHead, .tableRow { display: grid; gap: 8px; grid-template-columns: 2fr 1fr 1fr auto; align-items: center; }
        .tableHead { font-weight: 600; font-size: 12px; color: #6b7280; }
        .tableRow { padding: 6px 0; border-top: 1px solid #f3f4f6; font-size: 12px; }
        .holesLines { display: grid; gap: 4px; }
        .holesHead {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9ca3af;
          font-weight: 600;
        }
        .holesNums {
          display: grid;
          grid-template-columns: repeat(9, minmax(24px, 1fr));
          gap: 4px;
        }
        .holeNum {
          text-align: center;
          font-size: 9px;
          color: #9ca3af;
        }
        .holesRow {
          display: grid;
          grid-template-columns: repeat(9, minmax(24px, 1fr));
          gap: 4px;
        }
        .holeInline {
          display: grid;
          align-items: center;
        }
        .holeInline input {
          width: 100%;
          min-width: 24px;
          padding: 2px 4px;
          text-align: center;
          font-size: 10px;
        }
        .btn { border: 1px solid #d1d5db; background: #fff; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px; }
        .btn.primary { background: #2563eb; color: #fff; border-color: #2563eb; }
        .backBtn { padding: 4px 8px; font-size: 11px; }
        .alert { padding: 10px 12px; border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; color: #991b1b; }
      `}</style>
    </div>
  );
}
