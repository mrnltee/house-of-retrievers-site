"use client";

import { useRef, useState } from "react";
import Icon from "../components/Icon";

/**
 * The Stories cards on the media hub. Each card with a full story has a
 * "Read the story" button that opens it in a modal <dialog>: the browser keeps
 * focus inside it, Esc closes it, and focus goes back to the button.
 * Cards and stories come from storyCards() in app/lib/mediaStories.mjs.
 */
export default function StoryCards({ cards, approved }) {
  const dialog = useRef(null);
  const opener = useRef(null);
  const [open, setOpen] = useState(null);

  const show = (story, button) => {
    opener.current = button;
    setOpen(story);
    dialog.current?.showModal();
    dialog.current?.querySelector(".media-story-body")?.scrollTo?.(0, 0);
  };
  const close = () => dialog.current?.close();
  const onClose = () => { opener.current?.focus(); };

  return (
    <>
      <div className="media-angle-list">
        {cards.map(({ story, title, text }, index) => (
          <article key={story?.key || `${index}-${text.slice(0, 24)}`} className={story ? "has-story" : undefined}>
            {story ? (
              <div className="media-angle-head">
                <p className="media-angle-when">{story.when}</p>
                <h3>{story.title}</h3>
                <ul className="media-angle-facts">
                  {story.place !== story.beneficiary ? <li><Icon name="pin" /><span><span className="visually-hidden">Where: </span>{story.place}</span></li> : null}
                  {story.beneficiary ? <li><Icon name="heart" /><span>For {story.beneficiary}</span></li> : null}
                  {story.with ? <li><Icon name="paw" /><span>With {story.with}</span></li> : null}
                </ul>
              </div>
            ) : (
              <>
                {title ? <h3>{title}</h3> : null}
                <p>{text}</p>
              </>
            )}
            {story ? (
              <button type="button" className="media-story-open" aria-haspopup="dialog" onClick={(e) => show(story, e.currentTarget)}>
                Read the story <Icon name="arrow" />
              </button>
            ) : null}
          </article>
        ))}
      </div>
      <dialog ref={dialog} className="media-story" aria-labelledby="media-story-title" onClose={onClose} onClick={(e) => { if (e.target === dialog.current) close(); }}>
        <div className="media-story-box">
          <button type="button" className="media-message-close media-story-close" onClick={close} aria-label="Close the story">
            <Icon name="close" />
          </button>
          {open ? (
            <div className="media-story-body">
              <div className={`media-story-photos is-${open.photos.length}`}>
                {open.photos.map((photo) => <img key={photo.src} src={photo.src} alt={photo.alt} loading="lazy" />)}
              </div>
              <div className="media-story-text">
                <p className="media-story-meta">{open.meta}</p>
                <h2 id="media-story-title">{open.title}</h2>
                {approved ? null : <span className="media-draft-tag">Draft for approval</span>}
                {open.beneficiary ? <p className="media-story-for">For {open.beneficiary}</p> : null}
                {open.paragraphs.map((paragraph) => <p key={paragraph.slice(0, 32)}>{paragraph}</p>)}
                <div className="media-story-actions">
                  <a className="media-button media-button-dark" href="mailto:houseofretrieversph@gmail.com?subject=Story%20idea%20for%20House%20of%20Retrievers" data-message="story" onClick={close}>Ask us about this story <Icon name="external" /></a>
                  <button type="button" className="media-message-cancel" onClick={close}>Close</button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
