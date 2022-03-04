import ApplicationHead from '../components/ApplicationHead';
import { Button, Col, Container, FormControl, Row } from 'react-bootstrap';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '../utils';
import ErrorToastContainer from '../components/ErrorToastContainer';
import useToast from '../hooks/useToast';

export default function Home(): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toasts, addToast] = useToast();

  async function onFormSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);

    if (username.length === 0 || password.length === 0) {
      addToast(new Error('Você deve preencher tanto o usuário como a senha.'));
    }
    else {
      try {
        const response = await api.post('/login', { username, password });
      }
      catch (err) {
        console.error(err);
        addToast(err);
      }
    }

    setPassword('');
    setLoading(false);
  }

  function form() {
    if (loading) {
      return <></>;
    }

    return (
      <form onSubmit={onFormSubmit}>
        <Row className='my-3 justify-content-center'>
          <Col md={6}>
            <FormControl className='text-center theme-element' placeholder='Login' id='username' name='username'
              value={username} onChange={e => setUsername(e.currentTarget.value)} />
          </Col>
        </Row>
        <Row className='my-3 justify-content-center'>
          <Col md={6}>
            <FormControl className='text-center theme-element' placeholder='Senha' id='password' name='password'
              value={password} onChange={e => setPassword(e.currentTarget.value)} />
          </Col>
        </Row>
        <Row className='my-3 justify-content-center'>
          <Col md={6}>
            <Button type='submit' variant='light'>
              Entrar
            </Button>
          </Col>
        </Row>
      </form>
    );
  }

  return (
    <div>
      <ApplicationHead />
      <Container className='text-center'>
        <Row>
          <Col>
            <h1><label htmlFor='username'>Login</label></h1>
          </Col>
        </Row>
        {form()}
        <Row>
          <Col>
            <span className='me-2'>Não possui cadastro?</span>
            <Link href='/register' passHref>
              <a className='h5'>Cadastrar-se</a>
            </Link>
          </Col>
        </Row>
      </Container>
      <ErrorToastContainer toasts={toasts} />
    </div>
  );
}