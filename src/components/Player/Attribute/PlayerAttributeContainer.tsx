import { Attribute, AttributeStatus } from '@prisma/client';
import { useContext, useState } from 'react';
import Col from 'react-bootstrap/Col';
import Image from 'react-bootstrap/Image';
import Row from 'react-bootstrap/Row';
import { ShowDiceResult } from '../../../contexts';
import EditAvatarModal from '../../Modals/EditAvatarModal';
import GeneralDiceRollModal from '../../Modals/GeneralDiceRollModal';
import PlayerAttributeField from './PlayerAttributeField';
import PlayerAvatarImage from './PlayerAvatarImage';

type PlayerAttributeContainerProps = {
    playerAttributes: {
        value: number;
        maxValue: number;
        Attribute: Attribute
    }[];
    playerAttributeStatus: {
        value: boolean;
        AttributeStatus: AttributeStatus;
    }[];
    playerAvatars: {
        link: string | null;
        AttributeStatus: {
            id: number;
            name: string;
        } | null;
    }[];
    attributeDice: {
        value: number;
        branched: boolean;
    };
}

export default function PlayerAttributeContainer(props: PlayerAttributeContainerProps) {
    const [avatarModalShow, setAvatarModalShow] = useState(false);
    const [playerAttributeStatus, setPlayerStatus] = useState(props.playerAttributeStatus);
    const [generalDiceRollShow, setGeneralDiceRollShow] = useState(false);
    const [notify, setNotify] = useState(false);
    const showDiceResult = useContext(ShowDiceResult);

    function onStatusChanged(id: number, newValue: boolean) {
        const newPlayerStatus = [...playerAttributeStatus];
        const index = newPlayerStatus.findIndex(stat => stat.AttributeStatus.id === id);
        newPlayerStatus[index].value = newValue;
        setPlayerStatus(newPlayerStatus);
    }

    return (
        <>
            <Row className='mt-4 mb-2 justify-content-center'>
                <PlayerAvatarImage statusID={playerAttributeStatus.find(stat => stat.value)?.AttributeStatus.id}
                    onClick={() => setAvatarModalShow(true)} rerender={notify} />
                <Col xs={4} md={3} xl={2} className='align-self-center'>
                    <Image fluid src='/dice20.png' alt='Dado Geral'
                        className='clickable' onClick={() => setGeneralDiceRollShow(true)} />
                </Col>
            </Row>
            {props.playerAttributes.map(attr => {
                const status = playerAttributeStatus.filter(stat =>
                    stat.AttributeStatus.attribute_id === attr.Attribute.id);
                return <PlayerAttributeField key={attr.Attribute.id} attributeDice={props.attributeDice}
                    playerAttribute={attr} playerStatus={status} onStatusChanged={onStatusChanged} />;
            })}
            <EditAvatarModal playerAvatars={props.playerAvatars} show={avatarModalShow}
                onHide={() => setAvatarModalShow(false)} onUpdate={() => setNotify(n => !n)} />
            <GeneralDiceRollModal show={generalDiceRollShow} onHide={() => setGeneralDiceRollShow(false)}
                showDiceRollResult={showDiceResult} />
        </>
    );
}