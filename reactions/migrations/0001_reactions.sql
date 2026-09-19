CREATE TABLE reactions (
  article TEXT NOT NULL,
  voter TEXT NOT NULL,
  PRIMARY KEY (article, voter)
) WITHOUT ROWID;
