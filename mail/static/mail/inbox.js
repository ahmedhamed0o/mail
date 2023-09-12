document.addEventListener('DOMContentLoaded', function() {
  document.querySelector('#inbox').addEventListener('click', () => loadMailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => loadMailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => loadMailbox('archive'));
  document.querySelector('#compose').addEventListener('click', composeEmail);

 
  document.querySelector('#compose-form').addEventListener('submit', sendEmail);

 
  loadMailbox('inbox');
});

function composeEmail() {
 
  hideViews(['emails-view', 'email-detail-view']);
  displayView('compose-view');

  
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';
}

function viewEmail(id) {
  fetch(`/emails/${id}`)
    .then(response => response.json())
    .then(email => {
      console.log(email);

      hideViews(['emails-view', 'compose-view']);
      displayView('email-detail-view');

      document.querySelector('#email-detail-view').innerHTML = generateEmailDetailHtml(email);

      if (!email.read) {
        markEmailAsRead(email.id);
      }

      setupArchiveButton(email);
      setupReplyButton(email);
    });
}

function generateEmailDetailHtml(email) {
  return `
    <ul class="list-group">
      <li class="list-group-item" style="color: black;"><strong>From:</strong> ${email.sender}</li>
      <li class="list-group-item" style="color: black;"><strong>To:</strong> ${email.recipients}</li>
      <li class="list-group-item" style="color: black;"><strong>Subject:</strong> ${email.subject}</li>
      <li class="list-group-item" style="color: black;"><strong>Timestamp:</strong> ${email.timestamp}</li>
      <li class="list-group-item" style="color: black;">${email.body}</li>
    </ul>
  `;
}




function loadMailbox(mailbox) {
  displayView('emails-view');
  hideViews(['compose-view', 'email-detail-view']);

  document.querySelector('#emails-view').innerHTML = `<h3>${capitalize(mailbox)}</h3>`;

  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => displayEmails(emails));
}

function sendEmail(event) {
  event.preventDefault();

  const recipient = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: recipient,
      subject: subject,
      body: body
    })
  })
  .then(response => response.json())
  .then(result => {
    console.log(result);
    loadMailbox('sent');
  });
}

function hideViews(ids) {
  for (const id of ids) {
    document.querySelector(`#${id}`).style.display = 'none';
  }
}

function displayView(id) {
  document.querySelector(`#${id}`).style.display = 'block';
}

function markEmailAsRead(id) {
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  });
}

function setupArchiveButton(email) {
  const archiveButton = createButton(email.archived ? 'Unarchive' : 'Archive', email.archived ? 'btn-success' : 'btn-danger', () => {
    fetch(`/emails/${email.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: !email.archived
      })
    })
    .then(() => loadMailbox('archive'));
  });

  document.querySelector('#email-detail-view').append(archiveButton);
}

function setupReplyButton(email) {
  const replyButton = createButton('Reply', 'btn-info', () => {
    composeEmail();
    document.querySelector('#compose-recipients').value = email.sender;
    const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    document.querySelector('#compose-subject').value = subject;
    document.querySelector('#compose-body').value = `On ${email.timestamp} ${email.sender} wrote: ${email.body}`;
  });

  document.querySelector('#email-detail-view').append(replyButton);
}

function createButton(text, className, clickFunction) {
  const button = document.createElement('button');
  button.innerHTML = text;
  button.className = `btn ${className}`;
  button.addEventListener('click', clickFunction);
  return button;
}

function displayEmails(emails) {
  emails.forEach(email => {
    const newEmail = document.createElement('div');
    newEmail.className = email.read ? 'read' : 'unread';
    newEmail.innerHTML = `
      <h6>Sender: ${email.sender}</h6>
      <h5>Subject: ${email.subject}</h5>
      <p>${email.timestamp}</p>
    `;
    newEmail.addEventListener('click', () => viewEmail(email.id));
    document.querySelector('#emails-view').append(newEmail);
  });
}

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
