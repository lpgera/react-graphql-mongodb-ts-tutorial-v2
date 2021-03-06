import {Form} from 'antd';
import React, {FC, useContext, useState} from 'react';
import {gql, useMutation, useQuery} from "@apollo/client";
import {ClientSideValidation, ServerSideValidation} from "../utils/validation-tools"
import {NewNoteInput} from "../generated-inputs/NewNoteInput";
import NoteModificationScreen from "./NoteModificationScreen";
import {QUERY_NOTE_LIST, QUERY_TAGS} from "../utils/gql";
import {AppContext} from "../utils/AppContext";

const NewNote: FC = () => {
    const {user} = useContext(AppContext);

    const [form] = Form.useForm();

    const [isSubmitDisabled, SetIsSubmitDisabled] = useState<boolean>(false);

    const {loading: getTags_loading, data: getTags_data, error: getTags_error} = useQuery(QUERY_TAGS, {
        variables: {
            userId: user?._id
        }
        // fetchPolicy: 'no-cache'
    });

    const [NewNote, {data: NewNote_data}] = useMutation<() => void>(gql`
    mutation NewNote($title: String!, $text: String!, $tagIds: [String!]!) {
      NewNote(data :{title: $title, text: $text, tagIds: $tagIds}) {
        _id
        title
        text
        tags {
          _id
          name
          userId
        }         
      }
    }  
    `,
        {
            refetchQueries: [{
                query: QUERY_TAGS,
                variables: {
                    userId: user?._id
                },
            }, {
                query: QUERY_NOTE_LIST,
                variables: {
                    userId: user?._id
                },
            }],
            awaitRefetchQueries: true,
            onCompleted(data: any) {
                console.log(data)
                const newTags = data.NewNote.tags.map((tag: any) => (tag._id));
                console.log(newTags);
                form.setFieldsValue({
                    tagIds: newTags,
                });
            }
        });

    const onFinish = (values: any) => {
        console.log('onFinish:', values);

        // 'title', 'text', 'tagIds': if undefined, set to empty string or []
        const valuesUpdate = Object.fromEntries(['title', 'text', 'tagIds'].map((k: string) => {
            if (values[k]) return [k, values[k]];
            if (k === 'tagIds') return [k, []];
            return [k, ''];
        }));

        const input = Object.assign(new NewNoteInput(), values, valuesUpdate);
        console.log(input)

        ClientSideValidation(form, input, () => {
            SetIsSubmitDisabled(true)
            NewNote({variables: input}).then((data) => {
                // successful save
                SetIsSubmitDisabled(false)
            }).catch(e => {
                // server side validation error
                SetIsSubmitDisabled(false)
                ServerSideValidation(form, input, e, () => {
                    // after server side validation errors were displayed
                });
            });
        });
    };

    return <NoteModificationScreen form={form} tagsData={getTags_data} onFinish={onFinish}
                                   isSubmitDisabled={isSubmitDisabled} selectedMenuItem="newnote"/>

}

export default NewNote;